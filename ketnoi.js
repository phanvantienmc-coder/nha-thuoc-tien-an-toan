const sql = require("mssql/msnodesqlv8");

// Dùng tài khoản Windows hiện tại, giống kết nối trong SSMS.
const cauhinh = {
  connectionString: "Driver={ODBC Driver 17 for SQL Server};Server=lpc:(local);Database=QLBANTHUOC;Trusted_Connection=Yes;Encrypt=No;TrustServerCertificate=Yes;",
  pool: { max: 5, min: 0, idleTimeoutMillis: 30000 }
};

module.exports = { sql, cauhinh };
