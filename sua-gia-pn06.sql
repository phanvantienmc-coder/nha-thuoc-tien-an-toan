-- Sua dung dong PN06/A02 nhap nham don vi: 18000 dong = 18 nghin dong.
-- Chi chay neu gia hien tai van la 18000 va so luong la 5.
USE QLBANTHUOC;
SET XACT_ABORT ON;
BEGIN TRAN;
UPDATE dbo.CHITIETPHIEUNHAP
SET GIANHAP = 18.00
WHERE SOPN = N'PN06' AND MATHUOC = N'A02' AND SOLUONGNHAP = 5 AND GIANHAP = 18000.00;
COMMIT;
