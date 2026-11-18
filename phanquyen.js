const crypto = require('node:crypto');
const { promisify } = require('node:util');
const { sql } = require('./ketnoi');
const bamMatKhau = promisify(crypto.scrypt);
const phien = new Map();
const thuSai = new Map();
const thoiHan = 8 * 60 * 60 * 1000;

async function taoMaBam(matKhau, muoi) {
  return (await bamMatKhau(matKhau, muoi, 64)).toString('hex');
}
function maPhien(req) {
  const cookie = (req.headers.cookie || '').split(';').find(c => c.trim().startsWith('phien='));
  return cookie ? cookie.trim().slice(6) : '';
}
function donDep() {
  for (const [ma, thongTin] of phien) if (thongTin.hetHan < Date.now()) phien.delete(ma);
  for (const [ip, thongTin] of thuSai) if (thongTin.hetHan < Date.now()) thuSai.delete(ip);
}
async function layNhanVien(db, req) {
  donDep();
  const thongTin = phien.get(maPhien(req));
  if (!thongTin) return null;
  const ketQua = await db.request().input('ten', sql.VarChar(30), thongTin.ten)
    .query('SELECT TENDANGNHAP AS ten FROM dbo.TAIKHOANWEB WHERE TENDANGNHAP=@ten AND VAITRO=\'nhanvien\' AND HOATDONG=1');
  return ketQua.recordset[0] || null;
}
async function dangNhap(db, req, res, duLieu) {
  donDep();
  const ip = req.socket.remoteAddress;
  const soLan = thuSai.get(ip);
  if (soLan && soLan.dem >= 10) return { trangThai: 429, duLieu: { loi: 'Bạn đã thử quá nhiều lần. Vui lòng chờ 15 phút.' } };
  const { ten, matKhau } = duLieu || {};
  if (typeof ten !== 'string' || !/^[A-Za-z0-9_ ]{3,30}$/.test(ten) ||
      typeof matKhau !== 'string' || matKhau.length < 1 || matKhau.length > 128) {
    return { trangThai: 400, duLieu: { loi: 'Vui lòng nhập tên tài khoản và mật khẩu hợp lệ.' } };
  }
  const ketQua = await db.request().input('ten', sql.VarChar(30), ten)
    .query('SELECT TENDANGNHAP AS ten, MUOI AS muoi, MATKHAUBAM AS bam FROM dbo.TAIKHOANWEB WHERE TENDANGNHAP=@ten AND VAITRO=\'nhanvien\' AND HOATDONG=1');
  const taiKhoan = ketQua.recordset[0];
  // Vẫn băm khi không có tài khoản để tránh tiết lộ tài khoản qua thời gian trả lời.
  const bam = await taoMaBam(matKhau, taiKhoan ? taiKhoan.muoi : 'tai-khoan-khong-ton-tai');
  if (!taiKhoan || !crypto.timingSafeEqual(Buffer.from(bam, 'hex'), Buffer.from(taiKhoan.bam, 'hex'))) {
    thuSai.set(ip, { dem: (soLan ? soLan.dem : 0) + 1, hetHan: soLan ? soLan.hetHan : Date.now() + 15 * 60000 });
    return { trangThai: 401, duLieu: { loi: 'Tên đăng nhập hoặc mật khẩu không đúng.' } };
  }
  thuSai.delete(ip);
  phien.delete(maPhien(req));
  const ma = crypto.randomBytes(32).toString('hex');
  phien.set(ma, { ten: taiKhoan.ten, hetHan: Date.now() + thoiHan });
  res.setHeader('Set-Cookie', 'phien=' + ma + '; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800');
  return { trangThai: 200, duLieu: { ten: taiKhoan.ten, vaiTro: 'nhanvien' } };
}
function dangXuat(req, res) {
  phien.delete(maPhien(req));
  res.setHeader('Set-Cookie', 'phien=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');
}
module.exports = { taoMaBam, layNhanVien, dangNhap, dangXuat };
