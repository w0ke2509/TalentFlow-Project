const API_BASE = '/api';
const AUTH_KEY = 'talentflow_auth';

const toQueryString = (params = {}) => {
  const clean = Object.entries(params).reduce((acc, [k, v]) => {
    if (v !== undefined && v !== null && v !== '' && v !== 'undefined') {
      acc[k] = v;
    }
    return acc;
  }, {});
  const qs = new URLSearchParams(clean).toString();
  return qs ? `?${qs}` : '';
};

const getAuthToken = () => {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.token || null;
  } catch {
    return null;
  }
};

const handleUnauthorized = () => {
  try {
    localStorage.removeItem(AUTH_KEY);
  } catch {}
  window.dispatchEvent(new Event('talentflow:auth_expired'));
};

const authFetch = async (url, options = {}) => {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  const token = getAuthToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    ...options,
    headers
  });

  if (res.status === 401 && !url.includes('/auth/login')) {
    handleUnauthorized();
    const data = await res.json().catch(() => null);
    throw new Error(data?.message || 'Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.');
  }

  return res;
};

const parseJson = async (res) => {
  const text = await res.text();
  if (!text) {
    throw new Error(
      res.ok
        ? 'Máy chủ không trả dữ liệu. Hãy chạy npm run backend rồi thử lại.'
        : 'Không kết nối được backend (cổng 5000). Hãy chạy npm run backend.'
    );
  }
  try {
    const json = JSON.parse(text);
    if (!res.ok && json && json.message) {
      throw new Error(json.message);
    }
    return json;
  } catch (err) {
    if (!res.ok) {
      throw new Error(err.message || 'Lỗi xử lý yêu cầu phía máy chủ');
    }
    throw new Error('Backend trả về dữ liệu không hợp lệ. Kiểm tra npm run backend.');
  }
};

export const api = {
  login: async (data) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return parseJson(res);
  },

  // Dashboard
  getDashboard: async () => {
    const res = await authFetch(`${API_BASE}/dashboard`);
    return parseJson(res);
  },

  // Candidates
  getCandidates: async (params = {}) => {
    const res = await authFetch(`${API_BASE}/candidates${toQueryString(params)}`);
    return parseJson(res);
  },
  createCandidate: async (data) => {
    const res = await authFetch(`${API_BASE}/candidates`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
    return parseJson(res);
  },
  updateCandidate: async (id, data) => {
    const res = await authFetch(`${API_BASE}/candidates/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
    return parseJson(res);
  },
  deleteCandidate: async (id) => {
    const res = await authFetch(`${API_BASE}/candidates/${id}`, { method: 'DELETE' });
    return parseJson(res);
  },

  // Positions
  getPositions: async () => {
    const res = await authFetch(`${API_BASE}/positions`);
    return parseJson(res);
  },
  createPosition: async (data) => {
    const res = await authFetch(`${API_BASE}/positions`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
    return parseJson(res);
  },
  updatePosition: async (id, data) => {
    const res = await authFetch(`${API_BASE}/positions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
    return parseJson(res);
  },
  deletePosition: async (id) => {
    const res = await authFetch(`${API_BASE}/positions/${id}`, { method: 'DELETE' });
    return parseJson(res);
  },

  // Departments
  getDepartments: async () => {
    const res = await authFetch(`${API_BASE}/departments`);
    return parseJson(res);
  },
  createDepartment: async (data) => {
    const res = await authFetch(`${API_BASE}/departments`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
    return parseJson(res);
  },

  // Applications
  getApplications: async (params = {}) => {
    const res = await authFetch(`${API_BASE}/applications${toQueryString(params)}`);
    return parseJson(res);
  },
  createApplication: async (data) => {
    const res = await authFetch(`${API_BASE}/applications`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
    return parseJson(res);
  },
  updateApplicationStatus: async (id, statusData) => {
    const res = await authFetch(`${API_BASE}/applications/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify(statusData)
    });
    return parseJson(res);
  },
  deleteApplication: async (id) => {
    const res = await authFetch(`${API_BASE}/applications/${id}`, { method: 'DELETE' });
    return parseJson(res);
  },

  // Interviews
  getInterviews: async () => {
    const res = await authFetch(`${API_BASE}/interviews`);
    return parseJson(res);
  },
  createInterview: async (data) => {
    const res = await authFetch(`${API_BASE}/interviews`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
    return parseJson(res);
  },
  updateInterview: async (id, data) => {
    const res = await authFetch(`${API_BASE}/interviews/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
    return parseJson(res);
  },
  deleteInterview: async (id) => {
    const res = await authFetch(`${API_BASE}/interviews/${id}`, { method: 'DELETE' });
    return parseJson(res);
  },

  // Reports
  getReports: async () => {
    const res = await authFetch(`${API_BASE}/reports`);
    return parseJson(res);
  },

  // Employees (Collection 6)
  getEmployees: async (params = {}) => {
    const res = await authFetch(`${API_BASE}/employees${toQueryString(params)}`);
    return parseJson(res);
  },
  createEmployee: async (data) => {
    const res = await authFetch(`${API_BASE}/employees`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
    return parseJson(res);
  },
  convertCandidateToEmployee: async (data) => {
    const res = await authFetch(`${API_BASE}/employees/convert`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
    return parseJson(res);
  },
  updateEmployee: async (id, data) => {
    const res = await authFetch(`${API_BASE}/employees/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
    return parseJson(res);
  },
  deleteEmployee: async (id) => {
    const res = await authFetch(`${API_BASE}/employees/${id}`, { method: 'DELETE' });
    return parseJson(res);
  },

  // Department updates
  updateDepartment: async (id, data) => {
    const res = await authFetch(`${API_BASE}/departments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
    return parseJson(res);
  },
  deleteDepartment: async (id) => {
    const res = await authFetch(`${API_BASE}/departments/${id}`, { method: 'DELETE' });
    return parseJson(res);
  },

  // Mingo Explain Plan
  getExplainPlan: async (params = {}) => {
    const res = await authFetch(`${API_BASE}/mingo/explain${toQueryString(params)}`);
    return parseJson(res);
  }
};
