// Dùng chung cho menu khách hàng, nhân viên và trang đăng nhập.
(function () {
  const dauTrang = document.querySelector('header');
  const nutMenu = document.querySelector('.nutmenu');
  const menu = document.getElementById('menuchinh');
  function chonMucTrangChu() {
    if (!menu || !['/', '/index.html'].includes(location.pathname)) return;
    const links = Array.from(menu.querySelectorAll('a')).filter(a => !a.hidden);
    const chon = links.find(a => location.hash && a.getAttribute('href') === location.hash)
      || links.find(a => a.getAttribute('href') === '/')
      || links.find(a => a.getAttribute('href') === '#trangchu');
    menu.querySelectorAll('a').forEach(function (a) {
      a.classList.toggle('chon', a === chon);
      if (a === chon) a.setAttribute('aria-current', 'location');
      else a.removeAttribute('aria-current');
    });
  }
  window.addEventListener('hashchange', chonMucTrangChu);
  function dongMenu() {
    dauTrang.classList.remove('momenu');
    nutMenu.setAttribute('aria-expanded', 'false');
  }
  if (nutMenu && menu) {
    dauTrang.classList.add('cojs');
    nutMenu.addEventListener('click', function () {
      const mo = dauTrang.classList.toggle('momenu');
      nutMenu.setAttribute('aria-expanded', String(mo));
    });
    menu.addEventListener('click', function (suKien) {
      const link = suKien.target.closest('a');
      if (!link) return;
      dongMenu();
      if (link.getAttribute('href').startsWith('#')) {
        menu.querySelectorAll('a').forEach(function (a) {
          a.classList.toggle('chon', a === link);
          if (a === link) a.setAttribute('aria-current', 'location');
          else a.removeAttribute('aria-current');
        });
      }
    });
    document.addEventListener('keydown', function (suKien) {
      if (suKien.key === 'Escape' && dauTrang.classList.contains('momenu')) {
        dongMenu(); nutMenu.focus();
      }
    });
  }
  const form = document.getElementById('dangnhap');
  const baoLoi = document.getElementById('baodangnhap');
  async function capNhatMenu() {
    try {
      const phanHoi = await fetch('/api/tai-khoan');
      if (!phanHoi.ok) return;
      const taiKhoan = await phanHoi.json();
      const laNhanVien = taiKhoan.vaiTro === 'nhanvien';
      if (!laNhanVien && ['/nhapkho.html', '/donhang.html', '/quanly.html', '/duocsi.html', '/thongke.html'].includes(location.pathname)) {
        location.replace('/dangnhap.html');
        return;
      }
      document.querySelectorAll('[data-nhanvien]').forEach(function (the) { the.hidden = !laNhanVien; });
      document.querySelectorAll('[data-khach]').forEach(function (the) { the.hidden = laNhanVien; });
      document.querySelectorAll('[data-tennhanvien]').forEach(function (the) { the.textContent = taiKhoan.ten || ''; });
      chonMucTrangChu();
      if (form && laNhanVien) location.replace('/donhang.html');
    } catch { /* Khách vẫn xem và mua hàng nếu không tải được menu tài khoản. */ }
  }
  if (form) form.addEventListener('submit', async function (suKien) {
    suKien.preventDefault();
    const nut = form.querySelector('button');
    nut.disabled = true;
    baoLoi.textContent = 'Đang đăng nhập…';
    try {
      const phanHoi = await fetch('/api/dang-nhap', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ten: form.elements.ten.value.trim(), matKhau: form.elements.matKhau.value })
      });
      const ketQua = await phanHoi.json();
      if (!phanHoi.ok) throw new Error(ketQua.loi || 'Không đăng nhập được.');
      location.replace('/donhang.html');
    } catch (loi) { baoLoi.textContent = loi.message; }
    finally { nut.disabled = false; }
  });
  document.querySelectorAll('[data-dangxuat]').forEach(function (nut) {
    nut.addEventListener('click', async function () {
      nut.disabled = true;
      try {
        const phanHoi = await fetch('/api/dang-xuat', { method: 'POST' });
        if (!phanHoi.ok) throw new Error();
        location.replace('/');
      } catch { nut.textContent = 'Thử đăng xuất lại'; nut.disabled = false; }
    });
  });
  // Kiểm tra lại menu khi quay về trang bằng nút Back của trình duyệt.
  window.addEventListener('pageshow', capNhatMenu);
})();
