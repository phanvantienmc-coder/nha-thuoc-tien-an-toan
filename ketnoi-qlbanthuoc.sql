USE QLBANTHUOC;
GO
-- Bo sung du lieu website, giu nguyen bang va ban ghi dang hoc.
IF COL_LENGTH('dbo.KHACHHANG', 'SDT') IS NULL
  ALTER TABLE dbo.KHACHHANG ADD SDT VARCHAR(11) NULL;
IF COL_LENGTH('dbo.CHITIETHOADON', 'DONGIA') IS NULL
  ALTER TABLE dbo.CHITIETHOADON ADD DONGIA MONEY NULL;
GO
IF OBJECT_ID('dbo.MaKhachWeb', 'SO') IS NULL
  EXEC('CREATE SEQUENCE dbo.MaKhachWeb AS BIGINT START WITH 1 INCREMENT BY 1 MAXVALUE 999999999 NO CYCLE');
-- Hoa don moi dung HD + so tiep theo trong HOADON, do dulieu.js tao trong giao dich.
-- Sequence MaHoaDonWeb cu (neu co) duoc giu nguyen, khong con su dung.
GO
-- Don cu giu NULL; don moi mac dinh cho_xu_ly.
IF COL_LENGTH('dbo.HOADON', 'TRANGTHAI') IS NULL
  ALTER TABLE dbo.HOADON ADD TRANGTHAI VARCHAR(16) NULL
    CONSTRAINT DF_HOADON_TRANGTHAI DEFAULT ('hoan_thanh')
    CONSTRAINT CK_HOADON_TRANGTHAI CHECK (TRANGTHAI IN ('cho_xu_ly','hoan_thanh','da_huy'));
IF COL_LENGTH('dbo.THUOC', 'ANH') IS NULL
  ALTER TABLE dbo.THUOC ADD ANH NVARCHAR(255) NULL;
GO
