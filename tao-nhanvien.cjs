// Chạy ở terminal: node tao-nhanvien.cjs ten_tai_khoan
// Mật khẩu ngẫu nhiên chỉ hiện một lần, không ghi vào tệp.
const fs = require('node:fs');
const crypto = require('node:crypto');
const { sql, cauhinh } = require('./ketnoi');
const { taoMaBam } = require('./phanquyen');
(async function () {
  const ten = process.argv[2] || 'nhanvien';
  if (!/^[A-Za-z0-9_ ]{3,30}$/.test(ten)) throw new Error('Tên tài khoản gồm 3-30 chữ không dấu, số, dấu cách hoặc dấu _.');
  const db = await new sql.ConnectionPool(cauhinh).connect();
  try {
    await db.request().query(fs.readFileSync(require('node:path').join(__dirname, 'phanquyen.sql'), 'utf8').replace(/^\uFEFF/, ''));
    const daCo = await db.request().input('ten', sql.VarChar(30), ten).query('SELECT 1 FROM dbo.TAIKHOANWEB WHERE TENDANGNHAP=@ten');
    if (daCo.recordset.length) throw new Error('Tài khoản đã tồn tại. Không thay đổi mật khẩu cũ.');
    const matKhau = crypto.randomBytes(12).toString('base64url');
    const muoi = crypto.randomBytes(32).toString('hex');
    const bam = await taoMaBam(matKhau, muoi);
    await db.request().input('ten', sql.VarChar(30), ten).input('bam', sql.VarChar(128), bam).input('muoi', sql.VarChar(64), muoi)
      .query("INSERT dbo.TAIKHOANWEB(TENDANGNHAP,MATKHAUBAM,MUOI,VAITRO) VALUES (@ten,@bam,@muoi,'nhanvien')");
    console.log('Tài khoản: ' + ten + '\nMật khẩu: ' + matKhau + '\nHãy lưu mật khẩu ở nơi riêng.');
  } finally { await db.close(); }
})().catch(function (loi) { console.error(loi.message); process.exitCode = 1; });
