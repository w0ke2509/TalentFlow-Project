import Department from '../models/Department.js';
import Position from '../models/Position.js';
import Candidate from '../models/Candidate.js';
import Application from '../models/Application.js';
import Interview from '../models/Interview.js';
import Employee from '../models/Employee.js';
import { generateToken } from '../middleware/auth.js';
import { hashPassword, verifyPassword } from '../utils/password.js';

// 1. DASHBOARD STATS & AGGREGATION
export const getDashboardStats = async (req, res) => {
  try {
    const [
      totalCandidates,
      openPositions,
      totalInterviews,
      hiredCount,
      applicationsByStatus,
      recentApplications,
      upcomingInterviews
    ] = await Promise.all([
      Candidate.countDocuments(),
      Position.countDocuments({ status: 'open' }),
      Interview.countDocuments({ result: 'pending' }),
      Application.countDocuments({ status: 'hired' }),
      Application.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } }
      ]),
      Application.find()
        .populate('candidateId', 'fullName email phone')
        .populate('positionId', 'title')
        .sort({ appliedAt: -1 })
        .limit(5),
      Interview.find({ result: 'pending', scheduledAt: { $gte: new Date() } })
        .populate({
          path: 'applicationId',
          populate: [
            { path: 'candidateId', select: 'fullName email phone skills' },
            { path: 'positionId', select: 'title' }
          ]
        })
        .sort({ scheduledAt: 1 })
        .limit(6)
    ]);

    res.json({
      success: true,
      stats: {
        totalCandidates,
        openPositions,
        totalInterviews,
        hiredCount
      },
      applicationsByStatus,
      recentApplications,
      upcomingInterviews
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 2. CANDIDATES CONTROLLER
export const getCandidates = async (req, res) => {
  try {
    const { search, skill, minExp } = req.query;
    let filter = {};

    if (search && search !== 'undefined' && search.trim()) {
      filter.$or = [
        { fullName: { $regex: search.trim(), $options: 'i' } },
        { email: { $regex: search.trim(), $options: 'i' } },
        { phone: { $regex: search.trim(), $options: 'i' } }
      ];
    }

    if (skill && skill !== 'undefined' && skill.trim()) {
      filter.skills = { $regex: skill.trim(), $options: 'i' };
    }

    if (minExp && minExp !== 'undefined' && !isNaN(Number(minExp))) {
      filter.experienceYears = { $gte: Number(minExp) };
    }

    const candidates = await Candidate.find(filter).sort({ createdAt: -1 }).lean();

    // Đồng bộ trạng thái mới nhất từ applications
    const candidateIds = candidates.map(c => c._id);
    const applications = await Application.find({ candidateId: { $in: candidateIds } })
      .populate('positionId', 'title')
      .sort({ updatedAt: -1 });

    const appMap = {};
    for (const app of applications) {
      const cIdStr = app.candidateId.toString();
      if (!appMap[cIdStr]) {
        appMap[cIdStr] = app;
      }
    }

    const enrichedCandidates = candidates.map(c => {
      const latestApp = appMap[c._id.toString()];
      return {
        ...c,
        currentStatus: latestApp ? latestApp.status : (c.currentStatus || 'applied'),
        appliedPosition: latestApp?.positionId?.title || null
      };
    });

    res.json({ success: true, data: enrichedCandidates });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createCandidate = async (req, res) => {
  try {
    const candidate = new Candidate(req.body);
    await candidate.save();
    res.status(201).json({ success: true, data: candidate });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const updateCandidate = async (req, res) => {
  try {
    const candidate = await Candidate.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!candidate) return res.status(404).json({ success: false, message: 'Ứng viên không tồn tại' });
    res.json({ success: true, data: candidate });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const deleteCandidate = async (req, res) => {
  try {
    if (await Employee.exists({ candidateId: req.params.id })) {
      return res.status(400).json({ success: false, message: 'Ứng viên đã có hồ sơ nhân viên, không thể xóa.' });
    }
    const candidate = await Candidate.findByIdAndDelete(req.params.id);
    if (!candidate) return res.status(404).json({ success: false, message: 'Ứng viên không tồn tại' });
    
    // Tìm các hồ sơ ứng tuyển liên quan để xóa cascade cả lịch phỏng vấn
    const apps = await Application.find({ candidateId: req.params.id }).select('_id');
    const appIds = apps.map(a => a._id);
    if (appIds.length > 0) {
      await Interview.deleteMany({ applicationId: { $in: appIds } });
    }
    await Application.deleteMany({ candidateId: req.params.id });

    res.json({ success: true, message: 'Đã xóa ứng viên và hồ sơ liên quan' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 3. POSITIONS CONTROLLER
export const getPositions = async (req, res) => {
  try {
    const positions = await Position.find().populate('departmentId', 'name').sort({ createdAt: -1 });
    res.json({ success: true, data: positions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createPosition = async (req, res) => {
  try {
    if (req.body.quantity !== undefined && (!Number.isInteger(Number(req.body.quantity)) || Number(req.body.quantity) < 1)) {
      return res.status(400).json({ success: false, message: 'Chỉ tiêu tuyển dụng phải là số nguyên lớn hơn 0.' });
    }
    const position = new Position(req.body);
    await position.save();
    const populated = await Position.findById(position._id).populate('departmentId', 'name');
    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const updatePosition = async (req, res) => {
  try {
    const current = await Position.findById(req.params.id);
    if (!current) return res.status(404).json({ success: false, message: 'Vị trí không tồn tại' });
    const nextQuantity = req.body.quantity === undefined ? current.quantity : Number(req.body.quantity);
    if (!Number.isInteger(nextQuantity) || nextQuantity < 1) {
      return res.status(400).json({ success: false, message: 'Chỉ tiêu tuyển dụng phải là số nguyên lớn hơn 0.' });
    }
    const hiredCount = await Application.countDocuments({ positionId: current._id, status: 'hired' });
    if (nextQuantity < hiredCount) {
      return res.status(400).json({ success: false, message: 'Chỉ tiêu không thể thấp hơn số nhân sự đã tuyển.' });
    }
    if (req.body.status === 'open' && hiredCount >= nextQuantity) {
      return res.status(400).json({ success: false, message: 'Vị trí đã đủ chỉ tiêu, không thể mở tuyển.' });
    }
    const update = { ...req.body };
    if (req.body.status !== undefined && req.body.status !== current.status) update.closedByQuota = false;
    const position = await Position.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
    if (!position) return res.status(404).json({ success: false, message: 'Vị trí không tồn tại' });
    const populated = await Position.findById(position._id).populate('departmentId', 'name');
    res.json({ success: true, data: populated });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const deletePosition = async (req, res) => {
  try {
    const positionId = req.params.id;
    const appCount = await Application.countDocuments({ positionId });
    if (appCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Không thể xóa vị trí đang có ${appCount} hồ sơ ứng tuyển liên kết. Vui lòng điều chuyển hồ sơ hoặc chuyển trạng thái sang 'Đã đóng' (closed).`
      });
    }
    if (await Employee.exists({ positionId })) {
      return res.status(400).json({ success: false, message: 'Không thể xóa vị trí đang được nhân viên tham chiếu.' });
    }

    const deleted = await Position.findByIdAndDelete(positionId);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Vị trí tuyển dụng không tồn tại' });
    }
    res.json({ success: true, message: 'Đã xóa vị trí tuyển dụng thành công' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 4. DEPARTMENTS CONTROLLER
export const getDepartments = async (req, res) => {
  try {
    const departments = await Department.find().sort({ name: 1 });
    res.json({ success: true, data: departments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createDepartment = async (req, res) => {
  try {
    const department = new Department(req.body);
    await department.save();
    res.status(201).json({ success: true, data: department });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// 5. APPLICATIONS CONTROLLER (Hỗ trợ Kanban & $lookup)
export const getApplications = async (req, res) => {
  try {
    const { status, positionId } = req.query;
    let filter = {};
    if (status && status !== 'undefined' && status !== 'all') filter.status = status;
    if (positionId && positionId !== 'undefined' && positionId !== 'all') filter.positionId = positionId;

    const applications = await Application.find(filter)
      .populate('candidateId')
      .populate({
        path: 'positionId',
        populate: { path: 'departmentId', select: 'name' }
      })
      .sort({ appliedAt: -1 });

    res.json({ success: true, data: applications });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createApplication = async (req, res) => {
  try {
    const { candidateId, positionId } = req.body;
    if (!candidateId || !positionId) {
      return res.status(400).json({ success: false, message: 'candidateId và positionId là bắt buộc' });
    }

    const [candidate, position] = await Promise.all([
      Candidate.findById(candidateId),
      Position.findById(positionId)
    ]);

    if (!candidate) {
      return res.status(404).json({ success: false, message: 'Ứng viên không tồn tại' });
    }
    if (!position) {
      return res.status(404).json({ success: false, message: 'Vị trí tuyển dụng không tồn tại' });
    }

    if (position.status !== 'open') {
      return res.status(400).json({
        success: false,
        message: position.status === 'closed'
          ? 'Vị trí tuyển dụng này đã đóng, không thể tiếp nhận thêm hồ sơ mới.'
          : 'Vị trí tuyển dụng đang tạm ngưng, không thể tiếp nhận thêm hồ sơ mới.'
      });
    }

    const hiredCount = await Application.countDocuments({ positionId, status: 'hired' });
    if (hiredCount >= position.quantity) {
      return res.status(400).json({ success: false, message: 'Vị trí đã đủ chỉ tiêu tuyển dụng.' });
    }
    if (await Application.exists({ candidateId, positionId, status: { $ne: 'rejected' } })) {
      return res.status(400).json({ success: false, message: 'Ứng viên đã có hồ sơ đang xử lý cho vị trí này.' });
    }

    const application = new Application(req.body);
    await application.save();
    const populated = await Application.findById(application._id)
      .populate('candidateId')
      .populate('positionId');
    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const updateApplicationStatus = async (req, res) => {
  try {
    const { status, score, note, offerSalary, offerStartDate, offerNote, offerAccepted } = req.body;
    const updateData = {};

    const validStatuses = ['applied', 'screening', 'interview', 'accepted', 'hired', 'rejected'];
    if (status !== undefined) {
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `Trạng thái Kanban không hợp lệ. Chỉ chấp nhận các giá trị: ${validStatuses.join(', ')}.`
        });
      }
      updateData.status = status;
    }

    if (score !== undefined) {
      const numScore = Number(score);
      if (Number.isNaN(numScore) || numScore < 0 || numScore > 100) {
        return res.status(400).json({
          success: false,
          message: 'Điểm đánh giá hồ sơ phải là số nằm trong khoảng từ 0 đến 100.'
        });
      }
      updateData.score = numScore;
    }

    if (note !== undefined) updateData.note = note;

    const previousApplication = await Application.findById(req.params.id);
    if (!previousApplication) return res.status(404).json({ success: false, message: 'Hồ sơ không tồn tại' });

    const editingOffer = [offerSalary, offerStartDate, offerNote, offerAccepted].some(value => value !== undefined);
    if (editingOffer && previousApplication.status !== 'accepted') {
      return res.status(400).json({ success: false, message: 'Chỉ có thể lập đề nghị tại bước Gửi Đề Nghị.' });
    }
    if (offerSalary !== undefined) {
      const salary = Number(offerSalary);
      if (!Number.isFinite(salary) || salary <= 0) return res.status(400).json({ success: false, message: 'Lương đề nghị phải là số lớn hơn 0.' });
      updateData.offerSalary = salary;
    }
    if (offerStartDate !== undefined) {
      const date = new Date(offerStartDate);
      if (!offerStartDate || Number.isNaN(date.getTime())) return res.status(400).json({ success: false, message: 'Ngày nhận việc dự kiến không hợp lệ.' });
      updateData.offerStartDate = date;
    }
    if (offerNote !== undefined) updateData.offerNote = offerNote;
    if (offerAccepted !== undefined) {
      if (typeof offerAccepted !== 'boolean') return res.status(400).json({ success: false, message: 'Xác nhận ứng viên đồng ý không hợp lệ.' });
      updateData.offerAccepted = offerAccepted;
    } else if (offerSalary !== undefined || offerStartDate !== undefined) {
      updateData.offerAccepted = false;
    }
    if ((offerAccepted === true || (previousApplication.offerAccepted && editingOffer && offerAccepted !== false)) &&
        (!(updateData.offerSalary ?? previousApplication.offerSalary) || !(updateData.offerStartDate ?? previousApplication.offerStartDate))) {
      return res.status(400).json({ success: false, message: 'Cần nhập lương và ngày nhận việc trước khi xác nhận ứng viên đồng ý.' });
    }

    if (status === 'interview' && previousApplication.status !== 'interview' &&
        !await Interview.exists({ applicationId: previousApplication._id })) {
      return res.status(400).json({ success: false, message: 'Hãy đặt lịch phỏng vấn trước khi chuyển hồ sơ sang bước Phỏng vấn.' });
    }
    if (status === 'accepted' && previousApplication.status !== 'accepted' &&
        !await Interview.exists({ applicationId: previousApplication._id, result: 'pass' })) {
      return res.status(400).json({ success: false, message: 'Cần có kết quả phỏng vấn Đậu trước khi gửi đề nghị.' });
    }
    if (status === 'hired' && previousApplication.status !== 'hired' && previousApplication.status !== 'accepted') {
      return res.status(400).json({ success: false, message: 'Hồ sơ phải qua bước Gửi Đề Nghị trước khi tuyển dụng.' });
    }
    if (status === 'hired' && previousApplication.status !== 'hired' &&
        (!previousApplication.offerSalary || !previousApplication.offerStartDate || !previousApplication.offerAccepted)) {
      return res.status(400).json({ success: false, message: 'Cần lưu đề nghị và xác nhận ứng viên đồng ý trước khi tuyển dụng.' });
    }
    if (status && ['applied', 'screening', 'interview'].includes(status) && status !== previousApplication.status &&
        await Interview.exists({ applicationId: previousApplication._id, result: 'pass' })) {
      return res.status(400).json({ success: false, message: 'Hồ sơ đã phỏng vấn Đậu. Hãy xử lý tại bước Gửi Đề Nghị hoặc sửa kết quả phỏng vấn trước.' });
    }

    if (['accepted', 'hired', 'rejected'].includes(status)) {
      const pendingCount = await Interview.countDocuments({ applicationId: previousApplication._id, result: 'pending' });
      if (pendingCount > 0) {
        return res.status(400).json({ success: false, message: 'Hồ sơ còn lịch phỏng vấn đang chờ. Hãy chấm điểm hoặc hủy lịch trước khi chuyển giai đoạn.' });
      }
    }
    if (previousApplication.status === 'hired' && status && status !== 'hired' &&
        await Employee.exists({ candidateId: previousApplication.candidateId, positionId: previousApplication.positionId })) {
      return res.status(400).json({ success: false, message: 'Ứng viên đã có hồ sơ nhân viên. Hãy xử lý hồ sơ nhân viên trước khi đổi trạng thái tuyển dụng.' });
    }
    if (status === 'hired' && previousApplication.status !== 'hired') {
      const position = await Position.findById(previousApplication.positionId);
      if (!position) return res.status(404).json({ success: false, message: 'Vị trí tuyển dụng không tồn tại' });
      const hiredCount = await Application.countDocuments({ positionId: position._id, status: 'hired' });
      if (hiredCount >= position.quantity) {
        return res.status(400).json({ success: false, message: 'Vị trí đã đủ chỉ tiêu tuyển dụng.' });
      }
      const candidate = await Candidate.findById(previousApplication.candidateId);
      if (!candidate) return res.status(404).json({ success: false, message: 'Ứng viên không tồn tại' });
      if (await Application.exists({ candidateId: candidate._id, status: 'hired', _id: { $ne: previousApplication._id } })) {
        return res.status(400).json({ success: false, message: 'Ứng viên đã được tuyển ở một hồ sơ khác.' });
      }
      const employee = await Employee.findOne({ email: candidate.email });
      if (employee && (String(employee.candidateId) !== String(candidate._id) || String(employee.positionId) !== String(position._id))) {
        return res.status(400).json({ success: false, message: 'Email ứng viên đã thuộc hồ sơ nhân viên khác.' });
      }
    }

    const application = await Application.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true
    })
      .populate('candidateId')
      .populate({
        path: 'positionId',
        populate: { path: 'departmentId' }
      });

    if (!application) return res.status(404).json({ success: false, message: 'Hồ sơ không tồn tại' });

    // Khi chuyển sang "hired", tự động tạo hồ sơ nhân viên nếu chưa có.
    if (status === 'hired' && application.candidateId && application.positionId) {
      const cand = application.candidateId;
      const pos = application.positionId;
      const existingEmp = await Employee.findOne({ email: cand.email });
      if (existingEmp && (String(existingEmp.candidateId) !== String(cand._id) || String(existingEmp.positionId) !== String(pos._id))) {
        await Application.findByIdAndUpdate(application._id, { status: previousApplication.status });
        return res.status(400).json({ success: false, message: 'Email ứng viên đã thuộc hồ sơ nhân viên khác.' });
      }
      if (!existingEmp) {
        try {
          await Employee.create({
            candidateId: cand._id,
            fullName: cand.fullName,
            email: cand.email,
            password: '123456',
            role: 'employee',
            departmentId: pos.departmentId?._id || pos.departmentId,
            positionId: pos._id,
            startDate: application.offerStartDate,
            status: 'probation',
            officialSalary: application.offerSalary
          });
        } catch (employeeError) {
          await Application.findByIdAndUpdate(application._id, { status: previousApplication.status });
          throw employeeError;
        }
      }
    }

    if (status && application.candidateId) {
      const candId = application.candidateId._id || application.candidateId;
      await Candidate.findByIdAndUpdate(candId, { currentStatus: status });
    }

    // 4. Task B4: Kiểm soát tự động hạn ngạch chỉ tiêu (Headcount Limit)
    let headcountInfo = null;
    const posId = application.positionId?._id || application.positionId;
    if (posId) {
      const currentPos = await Position.findById(posId);
      if (currentPos) {
        const hiredCount = await Application.countDocuments({ positionId: posId, status: 'hired' });
        const quota = currentPos.quantity || 1;
        const isFull = hiredCount >= quota;

        if (status === 'hired' && isFull && currentPos.status === 'open') {
          // Tự động đóng tin tuyển dụng khi đã nhận đủ người
          await Position.findByIdAndUpdate(posId, { status: 'closed', closedByQuota: true });
        } else if (previousApplication.status === 'hired' && status && status !== 'hired' && !isFull && currentPos.status === 'closed' && currentPos.closedByQuota) {
          // Tự động mở lại vị trí nếu ứng viên bị chuyển khỏi trạng thái hired
          await Position.findByIdAndUpdate(posId, { status: 'open', closedByQuota: false });
        }

        headcountInfo = {
          positionId: posId,
          positionTitle: currentPos.title,
          hiredCount,
          quantity: quota,
          isFull
        };
      }
    }

    res.json({ success: true, data: application, headcountInfo });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const deleteApplication = async (req, res) => {
  try {
    const application = await Application.findById(req.params.id);
    if (!application) return res.status(404).json({ success: false, message: 'Hồ sơ ứng tuyển không tồn tại' });
    if (application.status === 'hired' || await Employee.exists({ candidateId: application.candidateId, positionId: application.positionId })) {
      return res.status(400).json({ success: false, message: 'Hồ sơ đã liên kết nhân viên, không thể xóa.' });
    }
    await Application.findByIdAndDelete(req.params.id);
    await Interview.deleteMany({ applicationId: req.params.id });
    res.json({ success: true, message: 'Đã xóa hồ sơ và phỏng vấn liên quan' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 6. INTERVIEWS CONTROLLER
export const getInterviews = async (req, res) => {
  try {
    const interviews = await Interview.find()
      .populate({
        path: 'applicationId',
        populate: [
          { path: 'candidateId', select: 'fullName email phone skills' },
          { path: 'positionId', select: 'title' }
        ]
      })
      .sort({ scheduledAt: -1 });

    res.json({ success: true, data: interviews });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createInterview = async (req, res) => {
  try {
    const application = await Application.findById(req.body.applicationId);
    if (!application) return res.status(404).json({ success: false, message: 'Hồ sơ ứng tuyển không tồn tại' });
    if (['accepted', 'hired', 'rejected'].includes(application.status)) {
      return res.status(400).json({ success: false, message: 'Hồ sơ đã kết thúc quy trình, không thể lên lịch phỏng vấn mới.' });
    }
    const scheduledAt = new Date(req.body.scheduledAt);
    if (!Number.isFinite(scheduledAt.getTime()) || scheduledAt < new Date()) {
      return res.status(400).json({ success: false, message: 'Thời gian phỏng vấn phải ở tương lai.' });
    }
    if (scheduledAt < application.appliedAt) {
      return res.status(400).json({ success: false, message: 'Lịch phỏng vấn không thể trước ngày nộp hồ sơ.' });
    }
    if (await Interview.exists({ applicationId: application._id, result: 'pending' })) {
      return res.status(400).json({ success: false, message: 'Hồ sơ đã có lịch phỏng vấn đang chờ. Hãy xử lý lịch đó trước.' });
    }
    const interview = new Interview({ ...req.body, result: 'pending', score: 0 });
    await interview.save();
    if (application.status !== 'interview') {
      await Application.findByIdAndUpdate(application._id, { status: 'interview' });
      await Candidate.findByIdAndUpdate(application.candidateId, { currentStatus: 'interview' });
    }
    const populated = await Interview.findById(interview._id).populate({
      path: 'applicationId',
      populate: [
        { path: 'candidateId', select: 'fullName email phone' },
        { path: 'positionId', select: 'title' }
      ]
    });
    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const updateInterview = async (req, res) => {
  try {
    let updateData = req.body;
    const previousInterview = await Interview.findById(req.params.id);
    if (!previousInterview) return res.status(404).json({ success: false, message: 'Lịch phỏng vấn không tồn tại' });
    if (req.body.applicationId && String(req.body.applicationId) !== String(previousInterview.applicationId)) {
      return res.status(400).json({ success: false, message: 'Không thể chuyển lịch phỏng vấn sang hồ sơ ứng tuyển khác.' });
    }

    if (req.body.scheduledAt !== undefined) {
      const nextTime = new Date(req.body.scheduledAt);
      if (!Number.isFinite(nextTime.getTime()) ||
          (nextTime.getTime() !== previousInterview.scheduledAt.getTime() &&
           (req.body.result ?? previousInterview.result) === 'pending' && nextTime < new Date())) {
        return res.status(400).json({ success: false, message: 'Lịch phỏng vấn đang chờ phải được chuyển tới thời gian tương lai.' });
      }
    }

    // QA RBAC: Interviewer CHỈ được phép cập nhật trường chấm điểm và kết quả phỏng vấn
    if (req.user?.role === 'interviewer') {
      const allowedUpdates = {};
      if (req.body.score !== undefined) {
        const scoreNum = Number(req.body.score);
        if (Number.isNaN(scoreNum) || scoreNum < 0 || scoreNum > 100) {
          return res.status(400).json({
            success: false,
            message: 'Điểm số không hợp lệ. Điểm phải là số nằm trong khoảng từ 0 đến 100.'
          });
        }
        allowedUpdates.score = scoreNum;
      }
      if (req.body.result !== undefined) {
        const validResults = ['pending', 'pass', 'fail'];
        if (!validResults.includes(req.body.result)) {
          return res.status(400).json({
            success: false,
            message: `Kết quả phỏng vấn không hợp lệ. Chỉ chấp nhận các giá trị: ${validResults.join(', ')}.`
          });
        }
        allowedUpdates.result = req.body.result;
      }
      if (req.body.feedback !== undefined) {
        allowedUpdates.feedback = req.body.feedback;
      } else if (req.body.comment !== undefined) {
        allowedUpdates.feedback = req.body.comment;
      }
      updateData = allowedUpdates;
    }

    const application = await Application.findById(previousInterview.applicationId);
    const nextResult = updateData.result ?? previousInterview.result;
    if (application?.status === 'hired' && previousInterview.result === 'pass' && nextResult !== 'pass') {
      return res.status(400).json({ success: false, message: 'Ứng viên đã được tuyển. Không thể đổi kết quả Đậu khi hồ sơ nhân viên còn hiệu lực.' });
    }
    if (nextResult === 'pass' && application && ['screening', 'interview'].includes(application.status) &&
        await Interview.exists({ applicationId: application._id, result: 'pending', _id: { $ne: previousInterview._id } })) {
      return res.status(400).json({ success: false, message: 'Hồ sơ còn lịch phỏng vấn khác đang chờ kết quả.' });
    }

    const interview = await Interview.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true
    })
      .populate({
        path: 'applicationId',
        populate: [
          { path: 'candidateId', select: 'fullName email phone' },
          { path: 'positionId', select: 'title' }
        ]
      });

    if (!interview) return res.status(404).json({ success: false, message: 'Buổi phỏng vấn không tồn tại' });
    let kanbanStatus = application?.status;
    if (application && nextResult === 'pass' && ['screening', 'interview'].includes(application.status)) {
      kanbanStatus = 'accepted';
    } else if (application && previousInterview.result === 'pass' && nextResult !== 'pass' && application.status === 'accepted') {
      kanbanStatus = 'interview';
    }
    if (application && kanbanStatus !== application.status) {
      try {
        await Application.findByIdAndUpdate(application._id, { status: kanbanStatus }, { runValidators: true });
        await Candidate.findByIdAndUpdate(application.candidateId, { currentStatus: kanbanStatus });
      } catch (statusError) {
        await Application.findByIdAndUpdate(application._id, { status: application.status });
        await Interview.findByIdAndUpdate(previousInterview._id, {
          result: previousInterview.result,
          score: previousInterview.score,
          feedback: previousInterview.feedback,
          comment: previousInterview.comment
        });
        throw statusError;
      }
    }
    res.json({ success: true, data: interview, kanbanStatus });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const deleteInterview = async (req, res) => {
  try {
    await Interview.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Đã xóa lịch phỏng vấn' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 7. AGGREGATION & REPORT CONTROLLER (Chuyên sâu cho Mingo demo)
export const getReports = async (req, res) => {
  try {
    // Pipeline 1: Thống kê ứng viên theo vị trí tuyển dụng ($lookup + $group + $sort)
    const candidatesByPosition = await Application.aggregate([
      {
        $group: {
          _id: '$positionId',
          totalCandidates: { $sum: 1 },
          avgScore: { $avg: '$score' }
        }
      },
      {
        $lookup: {
          from: 'positions',
          localField: '_id',
          foreignField: '_id',
          as: 'position'
        }
      },
      { $unwind: '$position' },
      {
        $project: {
          _id: 1,
          positionTitle: '$position.title',
          totalCandidates: 1,
          avgScore: { $round: ['$avgScore', 1] }
        }
      },
      { $sort: { totalCandidates: -1 } }
    ]);

    // Pipeline 2: Tỷ lệ tuyển dụng tổng thể ($group cond + $project hiringRate)
    const hiringRateStats = await Application.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          hired: {
            $sum: {
              $cond: [{ $eq: ['$status', 'hired'] }, 1, 0]
            }
          },
          interviewed: {
            $sum: {
              $cond: [{ $in: ['$status', ['interview', 'accepted', 'hired']] }, 1, 0]
            }
          },
          rejected: {
            $sum: {
              $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0]
            }
          }
        }
      },
      {
        $project: {
          _id: 0,
          total: 1,
          hired: 1,
          interviewed: 1,
          rejected: 1,
          hiringRate: {
            $cond: [
              { $gt: ['$total', 0] },
              { $round: [{ $multiply: [{ $divide: ['$hired', '$total'] }, 100] }, 1] },
              0
            ]
          }
        }
      }
    ]);

    // Pipeline 3: Top kỹ năng phổ biến nhất của các ứng viên ($unwind + $group + $sort)
    const topSkills = await Candidate.aggregate([
      { $unwind: '$skills' },
      {
        $group: {
          _id: '$skills',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // Pipeline 4: Phân bố số năm kinh nghiệm
    const expDistribution = await Candidate.aggregate([
      {
        $bucket: {
          groupBy: '$experienceYears',
          boundaries: [0, 1, 3, 5, 10],
          default: '10+ năm',
          output: {
            count: { $sum: 1 }
          }
        }
      }
    ]);

    // Pipeline 5: Hiệu quả theo kênh nguồn tuyển dụng ($group source + conversionRate)
    const sourceRoi = await Application.aggregate([
      {
        $group: {
          _id: { $ifNull: ['$source', 'Website'] },
          total: { $sum: 1 },
          hired: {
            $sum: { $cond: [{ $eq: ['$status', 'hired'] }, 1, 0] }
          },
          interviewed: {
            $sum: { $cond: [{ $in: ['$status', ['interview', 'accepted', 'hired']] }, 1, 0] }
          },
          avgScore: { $avg: '$score' }
        }
      },
      {
        $project: {
          _id: 0,
          source: '$_id',
          total: 1,
          hired: 1,
          interviewed: 1,
          avgScore: { $round: [{ $ifNull: ['$avgScore', 0] }, 1] },
          conversionRate: {
            $cond: [
              { $gt: ['$total', 0] },
              { $round: [{ $multiply: [{ $divide: ['$hired', '$total'] }, 100] }, 1] },
              0
            ]
          }
        }
      },
      { $sort: { total: -1 } }
    ]);

    // Pipeline 6: Thời gian trung bình hoàn tất tuyển dụng (Time-to-Hire tính theo ngày)
    const timeToHireStats = await Application.aggregate([
      { $match: { status: 'hired' } },
      {
        $project: {
          daysToHire: {
            $max: [
              1,
              {
                $round: [
                  {
                    $divide: [
                      { $subtract: [{ $ifNull: ['$updatedAt', '$appliedAt'] }, '$appliedAt'] },
                      1000 * 60 * 60 * 24
                    ]
                  },
                  1
                ]
              }
            ]
          }
        }
      },
      {
        $group: {
          _id: null,
          avgDays: { $avg: '$daysToHire' },
          minDays: { $min: '$daysToHire' },
          maxDays: { $max: '$daysToHire' },
          totalHired: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          avgDays: { $round: [{ $ifNull: ['$avgDays', 0] }, 1] },
          minDays: { $ifNull: ['$minDays', 0] },
          maxDays: { $ifNull: ['$maxDays', 0] },
          totalHired: 1
        }
      }
    ]);

    res.json({
      success: true,
      candidatesByPosition,
      hiringRate: hiringRateStats[0] || { total: 0, hired: 0, interviewed: 0, rejected: 0, hiringRate: 0 },
      topSkills,
      expDistribution,
      sourceRoi,
      timeToHire: timeToHireStats[0] || { avgDays: 0, minDays: 0, maxDays: 0, totalHired: 0 }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 8. EMPLOYEES & CONVERSION CONTROLLER (Collection thứ 6)
const employeePublicFields = '-password';

const toPublicEmployee = (doc) => {
  if (!doc) return doc;
  const obj = typeof doc.toObject === 'function' ? doc.toObject() : { ...doc };
  delete obj.password;
  return obj;
};

export const login = async (req, res) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập email và mật khẩu' });
    }

    const employee = await Employee.findOne({ email })
      .populate('departmentId', 'name code')
      .populate('positionId', 'title');

    if (!employee) {
      return res.status(401).json({ success: false, message: 'Email hoặc mật khẩu không đúng' });
    }

    const { match, needsRehash } = await verifyPassword(password, employee.password);
    if (!match) {
      return res.status(401).json({ success: false, message: 'Email hoặc mật khẩu không đúng' });
    }

    // Cơ chế chuyển đổi an toàn (JIT Migration) cho tài khoản cũ đang lưu plaintext
    if (needsRehash) {
      const hashedPassword = await hashPassword(password);
      await Employee.findByIdAndUpdate(employee._id, { password: hashedPassword });
      employee.password = hashedPassword;
    }

    if (employee.status === 'resigned') {
      return res.status(403).json({ success: false, message: 'Tài khoản đã ngừng hoạt động' });
    }

    // Task B5: Kiểm soát truy cập phân hệ ATS - Chặn nhân viên thông thường
    if (employee.role === 'employee') {
      return res.status(403).json({
        success: false,
        message: 'Tài khoản nhân viên thông thường không có quyền truy cập hệ thống Quản lý Tuyển dụng TalentFlow ATS. Vui lòng liên hệ phòng Nhân sự.'
      });
    }

    const token = generateToken({
      id: employee._id.toString(),
      email: employee.email,
      role: employee.role,
      fullName: employee.fullName
    });

    res.json({
      success: true,
      data: {
        ...toPublicEmployee(employee),
        token
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getEmployees = async (req, res) => {
  try {
    const { departmentId, status, role } = req.query;
    let filter = {};
    if (departmentId && departmentId !== 'undefined' && departmentId !== 'all') filter.departmentId = departmentId;
    if (status && status !== 'undefined' && status !== 'all') filter.status = status;
    if (role && role !== 'undefined' && role !== 'all') filter.role = role;

    const employees = await Employee.find(filter)
      .select(employeePublicFields)
      .populate('departmentId', 'name code')
      .populate('positionId', 'title')
      .populate('candidateId', 'fullName email phone skills')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: employees });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createEmployee = async (req, res) => {
  try {
    const position = await Position.findById(req.body.positionId);
    if (!position) return res.status(404).json({ success: false, message: 'Vị trí tuyển dụng không tồn tại' });
    if (String(position.departmentId) !== String(req.body.departmentId)) {
      return res.status(400).json({ success: false, message: 'Vị trí không thuộc phòng ban đã chọn.' });
    }
    const rawPassword = req.body.password || '123456';
    const hashedPassword = await hashPassword(rawPassword);
    const payload = {
      ...req.body,
      role: req.body.role || 'employee',
      password: hashedPassword
    };
    const employee = new Employee(payload);
    await employee.save();
    const populated = await Employee.findById(employee._id)
      .select(employeePublicFields)
      .populate('departmentId', 'name code')
      .populate('positionId', 'title');
    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const convertCandidateToEmployee = async (req, res) => {
  try {
    const { candidateId, positionId, departmentId, officialSalary, startDate } = req.body;
    const position = await Position.findById(positionId);
    if (!position) return res.status(404).json({ success: false, message: 'Vị trí tuyển dụng không tồn tại' });
    if (String(position.departmentId) !== String(departmentId)) {
      return res.status(400).json({ success: false, message: 'Vị trí không thuộc phòng ban đã chọn.' });
    }
    const application = await Application.findOne({ candidateId, positionId }).sort({ appliedAt: -1 });
    if (!application || !['accepted', 'hired'].includes(application.status)) {
      return res.status(400).json({ success: false, message: 'Chỉ có thể tiếp nhận ứng viên từ hồ sơ đã được chấp nhận cho đúng vị trí.' });
    }
    if (application.status === 'accepted' &&
        (!application.offerSalary || !application.offerStartDate || !application.offerAccepted)) {
      return res.status(400).json({ success: false, message: 'Cần lưu đề nghị và xác nhận ứng viên đồng ý trước khi tuyển dụng.' });
    }
    const pendingCount = await Interview.countDocuments({ applicationId: application._id, result: 'pending' });
    if (pendingCount > 0) {
      return res.status(400).json({ success: false, message: 'Hồ sơ còn lịch phỏng vấn đang chờ.' });
    }
    const hiredCount = await Application.countDocuments({ positionId, status: 'hired' });
    if (application.status !== 'hired' && hiredCount >= position.quantity) {
      return res.status(400).json({ success: false, message: 'Vị trí đã đủ chỉ tiêu tuyển dụng.' });
    }
    
    // Tìm candidate để lấy tên và email
    const candidate = await Candidate.findById(candidateId);
    if (!candidate) {
      return res.status(404).json({ success: false, message: 'Ứng viên không tồn tại' });
    }

    // Kiểm tra xem đã có employee với email này chưa
    const existingEmp = await Employee.findOne({ email: candidate.email });
    if (existingEmp) {
      return res.status(400).json({ success: false, message: 'Nhân viên này đã được tiếp nhận trước đó' });
    }

    const hashedPassword = await hashPassword('123456');
    const employee = new Employee({
      candidateId,
      fullName: candidate.fullName,
      email: candidate.email,
      password: hashedPassword,
      role: 'employee',
      departmentId,
      positionId,
      officialSalary: application.offerSalary || officialSalary || 20000000,
      startDate: application.offerStartDate || startDate || new Date(),
      status: 'probation'
    });

    await employee.save();

    // Cập nhật trạng thái ứng viên và hồ sơ
    candidate.currentStatus = 'hired';
    await candidate.save();

    const wasHired = application.status === 'hired';
    application.status = 'hired';
    await application.save();
    const nextHiredCount = hiredCount + (wasHired ? 0 : 1);
    if (nextHiredCount >= position.quantity && position.status === 'open') {
      await Position.findByIdAndUpdate(positionId, { status: 'closed', closedByQuota: true });
    }

    const populated = await Employee.findById(employee._id)
      .select(employeePublicFields)
      .populate('departmentId', 'name code')
      .populate('positionId', 'title');

    res.status(201).json({ success: true, data: populated, message: 'Chuyển đổi thành nhân viên chính thức thành công' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const updateEmployee = async (req, res) => {
  try {
    const currentEmployee = await Employee.findById(req.params.id);
    if (!currentEmployee) return res.status(404).json({ success: false, message: 'Nhân viên không tồn tại' });
    const departmentId = req.body.departmentId || currentEmployee.departmentId;
    const positionId = req.body.positionId || currentEmployee.positionId;
    const position = await Position.findById(positionId);
    if (!position) return res.status(404).json({ success: false, message: 'Vị trí tuyển dụng không tồn tại' });
    if (String(position.departmentId) !== String(departmentId)) {
      return res.status(400).json({ success: false, message: 'Vị trí không thuộc phòng ban đã chọn.' });
    }
    const payload = { ...req.body };
    if (payload.password && typeof payload.password === 'string' && payload.password.trim()) {
      payload.password = await hashPassword(payload.password.trim());
    } else {
      delete payload.password;
    }

    const employee = await Employee.findByIdAndUpdate(req.params.id, payload, { new: true, runValidators: true })
      .select(employeePublicFields)
      .populate('departmentId', 'name code')
      .populate('positionId', 'title');
    if (!employee) return res.status(404).json({ success: false, message: 'Nhân viên không tồn tại' });
    res.json({ success: true, data: employee });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const deleteEmployee = async (req, res) => {
  try {
    await Employee.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Đã xóa hồ sơ nhân viên' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Bổ sung quản lý Department
export const updateDepartment = async (req, res) => {
  try {
    const department = await Department.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!department) return res.status(404).json({ success: false, message: 'Phòng ban không tồn tại' });
    res.json({ success: true, data: department });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const deleteDepartment = async (req, res) => {
  try {
    const [positionCount, employeeCount] = await Promise.all([
      Position.countDocuments({ departmentId: req.params.id }),
      Employee.countDocuments({ departmentId: req.params.id })
    ]);
    if (positionCount > 0 || employeeCount > 0) {
      return res.status(400).json({ success: false, message: 'Phòng ban đang có vị trí hoặc nhân viên liên kết, không thể xóa.' });
    }
    await Department.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Đã xóa phòng ban' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 9. Task B2: MINGO & MONGODB EXPLAIN PLAN CONTROLLER
export const getExplainPlan = async (req, res) => {
  try {
    const queryType = req.query.type || 'compound_index';

    if (queryType === 'text_search') {
      const keyword = req.query.keyword || 'React';
      const explainResult = await Candidate.find({
        $text: { $search: keyword }
      }).explain('executionStats');

      const stats = explainResult.executionStats || {};
      const winningPlan = explainResult.queryPlanner?.winningPlan || {};

      return res.json({
        success: true,
        queryType: 'text_search',
        collection: 'candidates',
        indexName: 'fullName_text_email_text',
        queryDescription: `db.candidates.find({ $text: { $search: "${keyword}" } })`,
        stage: winningPlan.stage || 'TEXT_MATCH',
        executionTimeMillis: stats.executionTimeMillis || 0,
        totalDocsExamined: stats.totalDocsExamined || 0,
        nReturned: stats.nReturned || 0,
        isIndexUsed: true,
        summary: stats.totalDocsExamined === stats.nReturned ? 'Tối ưu chỉ mục toàn diện (Index Hit)' : 'Chỉ mục lọc theo text index',
        details: explainResult
      });
    }

    // Mặc định: Compound Index trên applications ({ positionId: 1, status: 1 })
    const samplePos = await Position.findOne();
    const posId = req.query.positionId || samplePos?._id;
    const explainResult = await Application.find({
      positionId: posId,
      status: 'applied'
    }).explain('executionStats');

    const stats = explainResult.executionStats || {};
    const winningPlan = explainResult.queryPlanner?.winningPlan || {};
    const inputStage = winningPlan.inputStage || {};
    const stage = inputStage.stage || winningPlan.stage || 'IXSCAN';

    return res.json({
      success: true,
      queryType: 'compound_index',
      collection: 'applications',
      indexName: 'positionId_1_status_1',
      queryDescription: `db.applications.find({ positionId: ObjectId("${posId}"), status: "applied" })`,
      stage,
      executionTimeMillis: stats.executionTimeMillis || 0,
      totalDocsExamined: stats.totalDocsExamined || 0,
      nReturned: stats.nReturned || 0,
      isIndexUsed: stage === 'IXSCAN',
      summary: stage === 'IXSCAN' ? 'Sử dụng Compound Index tối ưu (IXSCAN)' : 'Quét toàn bộ collection (COLLSCAN)',
      details: explainResult
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
