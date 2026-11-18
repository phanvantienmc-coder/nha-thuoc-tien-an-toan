let thuoc = [];
let dangLuu = false;
let dangTai = false;
let phieuNhap = [];
let daTaiPhieu = false;
const timPhieu = document.getElementById("timphieu");
const baoTimPhieu = document.getElementById("baotimphieu");
const formNhap = document.getElementById("nhapkho");
const dulieuNhap = document.getElementById("dulieunhap");
const dongThuoc = document.getElementById("dongthuoc");
const nhaCungCap = document.getElementById("nhacungcap");
const baoKho = document.getElementById("baokho");
const lamMoi = document.getElementById("lammoikho");
const tien = new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 });

// Gia nhap va tong tien API cung dung don vi nghin dong.
function tienViet(nghinDong) {
  return tien.format(Math.round(Number(nghinDong) * 1000));
}

function vanBan(chuoi) {
  return String(chuoi ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function thongBao(noidung, loi = false) {
  baoKho.textContent = noidung;
  baoKho.className = loi ? "loi" : "";
}
function ngayHomNay() {
  document.getElementById("ngaynhap").value = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit"
  }).format(new Date());
}
function themDong() {
  if (dongThuoc.children.length >= 100) {
    thongBao("Mỗi phiếu tối đa 100 dòng thuốc.", true);
    return;
  }
  const dong = document.createElement("tr");
  dong.innerHTML = `<td><select class="mathuoc" aria-label="Thuốc nhập" required>
    <option value="">Chọn thuốc</option>${thuoc.map(function (mon) {
      return `<option value="${vanBan(mon.id)}">${vanBan(mon.id)} · ${vanBan(mon.ten)}</option>`;
    }).join("")}</select></td>
    <td><input class="soluongnhap" aria-label="Số lượng nhập" type="number" min="1" max="2147483647" step="1" value="1" required /></td>
    <td><input class="gianhap" aria-label="Giá nhập (đồng)" type="number" min="0" max="999999999990" step="10" placeholder="Ví dụ: 18000" required /></td>
    <td><output>0 ₫</output></td>
    <td><button class="nutphu xoadong" type="button" aria-label="Xóa dòng thuốc">Xóa</button></td>`;
  dongThuoc.appendChild(dong);
  capNhatTong();
}
function capNhatTong() {
  let tongXu = 0;
  dongThuoc.querySelectorAll("tr").forEach(function (dong) {
    const soLuong = Number(dong.querySelector(".soluongnhap").value);
    const gia = Number(dong.querySelector(".gianhap").value) / 1000;
    const xu = Number.isFinite(soLuong) && Number.isFinite(gia) && soLuong >= 0 && gia >= 0
      ? soLuong * Math.round(gia * 100) : 0;
    dong.querySelector("output").textContent = tienViet(xu / 100);
    tongXu += xu;
  });
  document.getElementById("tongnhap").textContent = tienViet(tongXu / 100);
}
function hienPhieu() {
  if (!daTaiPhieu) return;
  const vung = document.getElementById("danhsachphieu");
  const ma = timPhieu.elements.maPhieu.value.trim().toUpperCase();
  const tuNgay = timPhieu.elements.tuNgay.value;
  const denNgay = timPhieu.elements.denNgay.value;
  baoTimPhieu.className = "";
  if (!timPhieu.checkValidity() || (tuNgay && denNgay && tuNgay > denNgay)) {
    baoTimPhieu.textContent = "Chọn ngày hợp lệ; ngày bắt đầu phải trước hoặc bằng ngày kết thúc.";
    baoTimPhieu.className = "loi";
    vung.replaceChildren();
    return;
  }
  const ketQua = phieuNhap.filter(function (phieu) {
    return phieu.soPhieu.toUpperCase().includes(ma) &&
      (!tuNgay || (phieu.ngayNhap && phieu.ngayNhap >= tuNgay)) &&
      (!denNgay || (phieu.ngayNhap && phieu.ngayNhap <= denNgay));
  });
  baoTimPhieu.textContent = "Hiển thị " + ketQua.length + "/" + phieuNhap.length + " phiếu nhập.";
  if (!ketQua.length) {
    vung.textContent = phieuNhap.length ? "Không có phiếu phù hợp. Thử đổi mã/ngày hoặc bấm Xóa bộ lọc." : "Chưa có phiếu nhập nào.";
    return;
  }
  const dangMo = new Set(Array.from(vung.querySelectorAll("details[open]")).map(the => the.dataset.ma));
  vung.innerHTML = ketQua.map(function (phieu) {
    const ngay = phieu.ngayNhap ? phieu.ngayNhap.split("-").reverse().join("/") : "Chưa có ngày";
    return `<details data-ma="${vanBan(phieu.soPhieu)}" ${dangMo.has(phieu.soPhieu) ? "open" : ""}><summary><strong>${vanBan(phieu.soPhieu)}</strong><span>${ngay}</span><span>${vanBan(phieu.nhaCungCap)}</span><span>${tienViet(phieu.tongTien)}</span></summary>
      <div class="bangcuon"><table><caption>Chi tiết phiếu ${vanBan(phieu.soPhieu)}</caption>
      <thead><tr><th scope="col">Thuốc</th><th scope="col">Số lượng</th><th scope="col">Giá nhập (đ)</th><th scope="col">Thành tiền</th></tr></thead><tbody>
      ${phieu.hang.map(function (mon) {
        return `<tr><td>${vanBan(mon.id)} · ${vanBan(mon.ten)}</td><td>${mon.soLuong ?? "Chưa có"}</td><td>${mon.giaNhap === null ? "Chưa có" : tienViet(mon.giaNhap)}</td><td>${mon.giaNhap === null || mon.soLuong === null ? "Chưa có" : tienViet(mon.soLuong * mon.giaNhap)}</td></tr>`;
      }).join("") || '<tr><td colspan="4">Phiếu chưa có chi tiết.</td></tr>'}</tbody></table></div>
      <p>Xóa phiếu sẽ giảm tồn kho theo số lượng đã nhập. Không thể hoàn tác.</p>
      <button type="button" class="nutphu" data-xoaphieu="${vanBan(phieu.soPhieu)}" ${dangLuu || dangTai ? 'disabled' : ''}>Xóa phiếu nhập</button></details>`;
  }).join("");
}

function khoaXoaPhieu(khoa) {
  document.querySelectorAll('[data-xoaphieu]').forEach(nut => { nut.disabled = khoa; });
}
document.getElementById('danhsachphieu').addEventListener('click', async function (suKien) {
  const nut = suKien.target.closest('button[data-xoaphieu]');
  if (!nut || dangLuu || dangTai) return;
  const soPhieu = nut.dataset.xoaphieu;
  if (!window.confirm('Xóa vĩnh viễn phiếu nhập ' + soPhieu + ' và chi tiết? Tồn kho sẽ giảm tương ứng. Máy chủ sẽ chặn nếu tồn kho bị âm.')) return;
  dangLuu = true; dulieuNhap.disabled = true; lamMoi.disabled = true; khoaXoaPhieu(true);
  thongBao('Đang xóa phiếu nhập…');
  let daXoa = false;
  try {
    const r = await fetch('/api/nhap-kho',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({hanhDong:'xoa',soPhieu})});
    if (r.status === 401) { location.replace('/dangnhap.html'); return; }
    const ketQua = await r.json();
    if (!r.ok) throw new Error(ketQua.loi || 'Không xóa được phiếu nhập.');
    daXoa = true;
    await taiDuLieu(); thongBao(ketQua.thongBao);
  } catch (loi) { thongBao(daXoa ? 'Đã xóa phiếu nhưng chưa tải lại được danh sách. Bấm Tải lại danh sách để kiểm tra.' : loi.message,true); }
  finally {
    dangLuu = false; dulieuNhap.disabled = !thuoc.length || nhaCungCap.options.length <= 1;
    lamMoi.disabled = false; khoaXoaPhieu(false);
  }
});
async function taiDuLieu() {
  if (dangTai) return;
  dangTai = true;
  khoaXoaPhieu(true);
  lamMoi.disabled = true;
  baoTimPhieu.textContent = "Đang tải lịch sử phiếu nhập…";
  try {
    const phanHoi = await Promise.all([fetch("/api/nhap-kho"), fetch("/api/san-pham")]);
    if (phanHoi.some(function (r) { return !r.ok; })) throw new Error("Không tải được dữ liệu nhập kho.");
    const duLieu = await Promise.all(phanHoi.map(function (r) { return r.json(); }));
    thuoc = duLieu[1].sanPham;
    const daChon = nhaCungCap.value;
    nhaCungCap.innerHTML = '<option value="">Chọn nhà cung cấp</option>' + duLieu[0].nhaCungCap.map(function (ncc) {
      return `<option value="${vanBan(ncc.id)}">${vanBan(ncc.id)} · ${vanBan(ncc.ten)}</option>`;
    }).join("");
    nhaCungCap.value = daChon;
    // Làm mới lựa chọn thuốc nhưng giữ các số lượng và giá đang nhập.
    dongThuoc.querySelectorAll(".mathuoc").forEach(function (chon) {
      const ma = chon.value;
      chon.innerHTML = '<option value="">Chọn thuốc</option>' + thuoc.map(function (mon) {
        return `<option value="${vanBan(mon.id)}">${vanBan(mon.id)} · ${vanBan(mon.ten)}</option>`;
      }).join("");
      chon.value = ma;
    });
    phieuNhap = duLieu[0].phieuNhap;
    daTaiPhieu = true;
    hienPhieu();
    if (!dongThuoc.children.length) themDong();
    dulieuNhap.disabled = !thuoc.length || !duLieu[0].nhaCungCap.length;
    if (dulieuNhap.disabled) thongBao("Cần có thuốc và nhà cung cấp trong cơ sở dữ liệu trước khi nhập kho.", true);
  } catch (loi) {
    baoTimPhieu.textContent = "Chưa tải lại được lịch sử. Kiểm tra máy chủ rồi bấm Tải lại danh sách.";
    baoTimPhieu.className = "loi";
    throw loi;
  } finally {
    dangTai = false;
    khoaXoaPhieu(dangLuu);
    lamMoi.disabled = false;
  }
}

timPhieu.addEventListener("input", hienPhieu);
timPhieu.addEventListener("submit", function (suKien) { suKien.preventDefault(); hienPhieu(); });
document.getElementById("xoaboloc").addEventListener("click", function () {
  timPhieu.reset(); hienPhieu(); timPhieu.elements.maPhieu.focus();
});

document.getElementById("themdong").addEventListener("click", function () {
  themDong();
  dongThuoc.lastElementChild.querySelector("select").focus();
});
dongThuoc.addEventListener("input", capNhatTong);
dongThuoc.addEventListener("click", function (suKien) {
  const nut = suKien.target.closest(".xoadong");
  if (!nut) return;
  nut.closest("tr").remove();
  if (!dongThuoc.children.length) themDong();
  capNhatTong();
  document.getElementById("themdong").focus();
});
lamMoi.addEventListener("click", async function () {
  thongBao("Đang tải lại danh sách…");
  try { await taiDuLieu(); if (!dulieuNhap.disabled) thongBao("Đã tải lại danh sách."); }
  catch { thongBao("Không tải được dữ liệu. Kiểm tra máy chủ rồi bấm Tải lại danh sách.", true); }
});
formNhap.addEventListener("submit", async function (suKien) {
  suKien.preventDefault();
  if (dangLuu || dangTai) return;
  const hang = Array.from(dongThuoc.querySelectorAll("tr")).map(function (dong) {
    return { id: dong.querySelector(".mathuoc").value,
      soLuong: Number(dong.querySelector(".soluongnhap").value), giaNhap: Number(dong.querySelector(".gianhap").value) / 1000 };
  });
  if (new Set(hang.map(function (mon) { return mon.id; })).size !== hang.length) {
    thongBao("Bạn đã chọn trùng thuốc. Hãy gộp số lượng vào một dòng.", true);
    return;
  }
  const phieu = { soPhieu: document.getElementById("sophieu").value.trim().toUpperCase(),
    ngayNhap: document.getElementById("ngaynhap").value, maNCC: nhaCungCap.value, hang };
  dangLuu = true;
  khoaXoaPhieu(true);
  dulieuNhap.disabled = true;
  lamMoi.disabled = true;
  thongBao("Đang lưu phiếu nhập…");
  try {
    const phanHoi = await fetch("/api/nhap-kho", { method: "POST",
      headers: { "Content-Type": "application/json" }, body: JSON.stringify(phieu) });
    const ketQua = await phanHoi.json();
    if (!phanHoi.ok) { thongBao(ketQua.loi || "Không lưu được phiếu nhập.", true); return; }
    formNhap.reset();
    ngayHomNay();
    dongThuoc.innerHTML = "";
    themDong();
    const thanhCong = "Đã lưu phiếu " + ketQua.soPhieu + " · " + tienViet(ketQua.tongTien) + ". Tồn kho đã được cập nhật.";
    thongBao(thanhCong);
    try { await taiDuLieu(); }
    catch { thongBao(thanhCong + " Chưa tải lại được lịch sử; bấm Tải lại danh sách."); }
  } catch {
    thongBao("Chưa nhận được xác nhận từ máy chủ. Kiểm tra lịch sử hoặc tải lại danh sách trước khi thử lưu lại cùng số phiếu.", true);
  } finally {
    dangLuu = false;
    khoaXoaPhieu(false);
    dulieuNhap.disabled = false;
    lamMoi.disabled = false;
  }
});
ngayHomNay();
taiDuLieu().then(function () { if (!dulieuNhap.disabled) thongBao(""); }).catch(function () {
  thongBao("Không tải được dữ liệu. Kiểm tra máy chủ rồi bấm Tải lại danh sách.", true);
});
