/**
 * Tiện ích xử lý chuỗi kết nối MongoDB an toàn
 */

/**
 * Che giấu thông tin đăng nhập (username, password) trong chuỗi kết nối MongoDB.
 * Ví dụ: 
 *   mongodb://admin:secret123@localhost:27017/db -> mongodb://admin:****@localhost:27017/db
 *   mongodb+srv://user:pass@cluster.mongodb.net/db -> mongodb+srv://user:****@cluster.mongodb.net/db
 *   mongodb://localhost:27017/db -> mongodb://localhost:27017/db
 *
 * @param {string} uri Chuỗi kết nối MongoDB
 * @returns {string} Chuỗi kết nối đã được che mật khẩu
 */
export function maskMongoUri(uri) {
  if (!uri || typeof uri !== 'string') return '';
  return uri.replace(/(mongodb(?:\+srv)?:\/\/[^:]+:)([^@]+)(@)/i, '$1****$3');
}
