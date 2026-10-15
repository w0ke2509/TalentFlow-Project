import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

export const isBcryptHash = (str) => {
  if (typeof str !== 'string') return false;
  return /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(str);
};

export const hashPassword = async (plainPassword) => {
  if (!plainPassword || typeof plainPassword !== 'string') {
    throw new Error('Mật khẩu không hợp lệ để băm');
  }
  // Nếu đã là bcrypt hash thì không hash lại lần 2
  if (isBcryptHash(plainPassword)) {
    return plainPassword;
  }
  return bcrypt.hash(plainPassword, SALT_ROUNDS);
};

export const verifyPassword = async (plainPassword, storedPassword) => {
  if (!plainPassword || !storedPassword) return { match: false, needsRehash: false };

  if (isBcryptHash(storedPassword)) {
    const match = await bcrypt.compare(plainPassword, storedPassword);
    return { match, needsRehash: false };
  }

  // Hỗ trợ tạm thời tài khoản demo cũ chưa chạy migration
  const match = plainPassword === storedPassword;
  return { match, needsRehash: match };
};
