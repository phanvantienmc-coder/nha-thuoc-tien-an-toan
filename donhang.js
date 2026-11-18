const danhSach = document.getElementById('danhsach');
const thongBao = document.getElementById('thongbao');
const timDon = document.getElementById('timdon');
const taiLai = document.getElementById('tailai');
let donHang = [];
let danhSachDs = [];
let dangTai = false;
let dangPhanCong = false;
let dangDoiTrangThai = false;

function tienViet(gia) {
  if (gia === null) return 'Chưa có dữ liệu';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Math.round(gia * 1000));
}
function taoThe(ten, noiDung, cha) {
  const the = document.createElement(ten);
  the.textContent = noiDung;
  cha.appendChild(the);
  return the;
}
function boDau(chu) {
  return String(chu || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
}
function khoaPhanCong() {
  const khoa = dangTai || dangPhanCong || dangDoiTrangThai;
  taiLai.disabled = khoa;
  timDon.disabled = khoa;
  document.querySelectorAll('.phancong fieldset, .xulydon fieldset').forEach(the => { the.disabled = khoa; });
}
function hienXuLy(don, cha) {
  const khung = document.createElement('div');
  khung.className = 'xulydon'; cha.appendChild(khung);
  const the = document.createElement('fieldset'); khung.appendChild(the);
  taoThe('legend', 'Xóa hóa đơn', the);
  taoThe('p', 'Xóa cả chi tiết thuốc và phân công. Tồn kho và thống kê sẽ được tính lại. Không thể hoàn tác.', the);
  const bao = taoThe('p', '', khung); bao.setAttribute('role', 'status');
  const xoa = taoThe('button', 'Xóa hóa đơn', the);
  xoa.type = 'button'; xoa.className = 'nuthuy';
  xoa.addEventListener('click', () => guiXoaDon(don.maDon, bao));
}
async function guiXoaDon(maDon, bao) {
  if (dangTai || dangPhanCong || dangDoiTrangThai) return;
  if (!window.confirm('Xóa vĩnh viễn hóa đơn ' + maDon + '? Chi tiết và phân công cũng bị xóa; thuốc của đơn sẽ trở lại tồn kho.')) return;
  dangDoiTrangThai = true; khoaPhanCong(); bao.textContent = 'Đang xóa hóa đơn…';
  try {
    const r = await fetch('/api/xoa-hoa-don', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ maDon }) });
    if (r.status === 401) { location.replace('/dangnhap.html'); return; }
    const ketQua = await r.json();
    if (!r.ok) throw new Error(ketQua.loi || 'Không xóa được hóa đơn.');
    if (await taiDon()) thongBao.textContent = ketQua.thongBao;
  } catch (loi) { bao.textContent = loi.message; }
  finally { dangDoiTrangThai = false; khoaPhanCong(); }
}
function hienPhanCong(don, cha) {
  const form = document.createElement('form');
  form.className = 'phancong';
  cha.appendChild(form);
  const khung = document.createElement('fieldset');
  form.appendChild(khung);
  taoThe('legend', 'Dược sĩ được phân công', khung);
  taoThe('p', 'Khi thanh toán, web tự đối chiếu thuốc trong hóa đơn với thuốc dược sĩ phụ trách để lưu phân công. Bạn có thể điều chỉnh bên dưới khi cần.', khung);
  const bao = taoThe('p', '', form);
  bao.setAttribute('role', 'status');
  bao.setAttribute('aria-live', 'polite');
  const daPhan = don.duocSi || [];
  const danhSach = document.createElement('ul');
  khung.appendChild(danhSach);
  for (const ds of daPhan) {
    const dong = document.createElement('li');
    danhSach.appendChild(dong);
    const ten = taoThe('span', (ds.ten || 'Chưa có tên') + ' · ' + ds.id, dong);
    taoThe('small', ds.maThuoc ? 'Thuốc phụ trách: ' + (ds.tenThuoc || ds.maThuoc) : 'Chưa phân thuốc phụ trách', ten);
    if (don.trangThai === 'da_huy') continue;
    const bo = taoThe('button', 'Bỏ phân công', dong);
    bo.type = 'button';
    bo.className = 'nutphu';
    bo.setAttribute('aria-label', 'Bỏ phân công ' + (ds.ten || ds.id) + ' khỏi ' + don.maDon);
    bo.addEventListener('click', () => guiPhanCong('bo', don.maDon, ds.id, bao));
  }
  if (!daPhan.length) taoThe('p', 'Chưa có dược sĩ phù hợp được lưu cho hóa đơn. Kiểm tra thuốc phụ trách tại mục Dược sĩ.', khung);
  if (don.trangThai === 'da_huy') { taoThe('p', 'Giữ lại phân công cũ để tra cứu đơn đã hủy.', khung); return; }
  const nhan = taoThe('label', 'Thêm dược sĩ cho hóa đơn ' + don.maDon, khung);
  const chon = document.createElement('select');
  chon.required = true;
  chon.name = 'maDuocSi';
  nhan.appendChild(chon);
  taoThe('option', 'Chọn dược sĩ', chon).value = '';
  const conLai = danhSachDs.filter(ds => !daPhan.some(d => d.id === ds.id));
  for (const ds of conLai) {
    taoThe('option', ds.id + ' · ' + (ds.ten || 'Chưa có tên') + (ds.tenThuoc ? ' · ' + ds.tenThuoc : ''), chon).value = ds.id;
  }
  const them = taoThe('button', 'Phân công', khung);
  them.type = 'submit';
  chon.disabled = conLai.length === 0;
  them.disabled = conLai.length === 0;
  if (!danhSachDs.length) taoThe('p', 'Chưa có dược sĩ. Thêm dược sĩ tại mục Dược sĩ trên menu.', khung);
  else if (!conLai.length) taoThe('p', 'Tất cả dược sĩ đã được phân công cho hóa đơn này.', khung);
  form.addEventListener('submit', function (suKien) {
    suKien.preventDefault();
    guiPhanCong('them', don.maDon, chon.value, bao);
  });
}
async function guiPhanCong(hanhDong, maDon, maDuocSi, bao) {
  if (dangPhanCong || dangTai || dangDoiTrangThai) return;
  dangPhanCong = true;
  khoaPhanCong();
  bao.textContent = 'Đang lưu phân công…';
  let daLuu = false;
  try {
    const phanHoi = await fetch('/api/phan-cong', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hanhDong, maDon, maDuocSi }) });
    if (phanHoi.status === 401) { location.replace('/dangnhap.html'); return; }
    const ketQua = await phanHoi.json();
    if (!phanHoi.ok) throw new Error(ketQua.loi || 'Không lưu được phân công.');
    daLuu = true;
    if (await taiDon()) thongBao.textContent = ketQua.thongBao;
    else thongBao.textContent = 'Đã lưu phân công nhưng chưa tải lại được dữ liệu. Bấm Tải lại danh sách để kiểm tra.';
  } catch (loi) {
    (daLuu ? thongBao : bao).textContent = loi.message;
  } finally { dangPhanCong = false; khoaPhanCong(); }
}
function hienDon() {
  const dangMo = new Set(Array.from(danhSach.querySelectorAll('details[open]')).map(the => the.dataset.ma));
  danhSach.replaceChildren();
  const tuKhoa = boDau(timDon.value.trim());
  const ketQua = donHang.filter(function (don) {
    return boDau([don.maDon, don.hoTen, don.dienThoai].join(' ')).includes(tuKhoa);
  });
  thongBao.textContent = ketQua.length + ' đơn hàng. Bấm vào một đơn để xem chi tiết.';
  if (!ketQua.length) thongBao.textContent = 'Không có đơn hàng phù hợp.';
  for (const don of ketQua) {
    const muc = document.createElement('details');
    muc.dataset.ma = don.maDon;
    muc.open = dangMo.has(don.maDon);
    danhSach.appendChild(muc);
    const dau = document.createElement('summary');
    muc.appendChild(dau);
    taoThe('strong', don.maDon, dau);
    const ngay = don.ngay ? don.ngay.split('-').reverse().join('/') : 'Chưa có ngày';
    taoThe('span', ngay, dau);
    taoThe('span', don.hoTen || 'Chưa có tên khách', dau);
    taoThe('span', tienViet(don.tongTien), dau);
    const chiTiet = document.createElement('div');
    chiTiet.className = 'chitiet';
    muc.appendChild(chiTiet);
    taoThe('p', 'Mã hóa đơn: ' + don.maDon, chiTiet);
    taoThe('p', 'Khách hàng: ' + (don.hoTen || 'Chưa có dữ liệu'), chiTiet);
    taoThe('p', 'Mã khách hàng: ' + (don.maKhach || 'Chưa có dữ liệu'), chiTiet);
    taoThe('p', 'Điện thoại: ' + (don.dienThoai || 'Chưa có dữ liệu'), chiTiet);
    taoThe('p', 'Địa chỉ: ' + (don.diaChi || 'Chưa có dữ liệu'), chiTiet);
    const cuon = document.createElement('div');
    cuon.className = 'bangcuon';
    chiTiet.appendChild(cuon);
    const bang = document.createElement('table');
    cuon.appendChild(bang);
    taoThe('caption', 'Thuốc trong đơn ' + don.maDon, bang);
    const dauBang = bang.createTHead().insertRow();
    for (const cot of ['Mã thuốc', 'Tên thuốc', 'Số lượng', 'Đơn giá', 'Thành tiền']) {
      const th = taoThe('th', cot, dauBang);
      th.scope = 'col';
    }
    const than = bang.createTBody();
    for (const hang of don.hang) {
      const dong = than.insertRow();
      const tien = hang.gia === null || hang.soLuong === null ? null : hang.gia * hang.soLuong;
      for (const giaTri of [hang.id, hang.ten || 'Chưa có tên', hang.soLuong === null ? 'Chưa có dữ liệu' : hang.soLuong, tienViet(hang.gia), tienViet(tien)]) taoThe('td', giaTri, dong);
    }
    if (!don.hang.length) taoThe('p', 'Đơn này chưa có chi tiết thuốc.', chiTiet);
    taoThe('strong', 'Tổng tiền: ' + tienViet(don.tongTien), chiTiet);
    if (don.tongTien === null) {
      taoThe('p', 'Đơn cũ thiếu giá bán hoặc số lượng nên chưa tính được tổng tiền. Giá hiện tại không được dùng để thay thế giá của đơn cũ.', chiTiet).className = 'ghichu';
    }
    hienXuLy(don, chiTiet);
    hienPhanCong(don, chiTiet);
  }
  khoaPhanCong();
}
async function taiDon() {
  dangTai = true;
  khoaPhanCong();
  thongBao.textContent = 'Đang tải đơn hàng…';
  try {
    const phanHoi = await fetch('/api/don-hang');
    if (phanHoi.status === 401) { location.replace('/dangnhap.html'); return; }
    if (!phanHoi.ok) throw new Error('Không tải được đơn hàng. Hãy kiểm tra máy chủ rồi thử lại.');
    const duLieu = await phanHoi.json();
    donHang = duLieu.donHang;
    danhSachDs = duLieu.duocSi || [];
    hienDon();
    return true;
  } catch (loi) {
    danhSach.replaceChildren();
    thongBao.textContent = loi.message;
    return false;
  } finally { dangTai = false; khoaPhanCong(); }
}
timDon.addEventListener('input', hienDon);
taiLai.addEventListener('click', taiDon);
taiDon();
