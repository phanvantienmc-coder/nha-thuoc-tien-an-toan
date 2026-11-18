let sanpham = [];
const giohang = {};
const datdon = document.getElementById("datdon");
const thongbao = document.getElementById("thongbao");
let dangDat = false;
const tim = document.getElementById("tim");
const nhom = document.getElementById("nhom");
const danhsach = document.getElementById("danhsach");
const monhang = document.getElementById("monhang");
const dinhdang = new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" });

// Gia trong SQL Server tinh bang nghin dong, web hien thi bang dong.
function tienViet(nghinDong) {
  return dinhdang.format(Math.round(Number(nghinDong) * 1000));
}

function chuanhoa(chuoi) {
  return chuoi.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d");
}

function vanBanHTML(chuoi) {
  return chuoi.replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function hienSanPham() {
  danhsach.innerHTML = "";
  const tukhoa = chuanhoa(tim.value.trim());

  sanpham.forEach(function (mon) {
    const vitri = mon.id;
    const dungTen = chuanhoa(mon.ten).includes(tukhoa);
    const dungNhom = !nhom.value || mon.nhom === nhom.value;
    if (dungTen && dungNhom) {
      const anh = duongDanAnh(mon);
      danhsach.innerHTML += `
        <article class="sanpham">
          <div class="anhthuoc">${anh ? `<img src="${vanBanHTML(anh)}" alt="${vanBanHTML(mon.ten)}" loading="lazy" width="300" height="220" />` : `<span>${vanBanHTML(mon.id)}</span>`}</div>
          ${anhThuoc[mon.id] && anh === '/' + anhThuoc[mon.id].tep ? `<a class="nguonanh" href="${anhThuoc[mon.id].nguon}" target="_blank" rel="noopener noreferrer">Ảnh minh họa · Nguồn ảnh <span aria-hidden="true">&#8599;</span></a>` : ""}
          <div class="thongtin">
          <h3>${vanBanHTML(mon.ten)}</h3>
          <small>${vanBanHTML(mon.nhom)}</small>
          <p class="gia">${tienViet(mon.gia)}</p>
          <p>Còn ${mon.ton} sản phẩm</p>
          <button type="button" data-vitri="${vitri}" ${mon.ton <= 0 ? "disabled" : ""} aria-label="Thêm ${vanBanHTML(mon.ten)} vào giỏ"><svg class="icon" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 4h5l4 17h14l4-13H8"/><circle cx="13" cy="27" r="1.6"/><circle cx="24" cy="27" r="1.6"/></svg>${mon.ton === 0 ? "Hết hàng" : "Thêm vào giỏ"}</button>
          </div>
        </article>`;
    }
  });

  if (danhsach.innerHTML === "") {
    danhsach.textContent = "Không tìm thấy sản phẩm.";
  }
}

function hienGioHang() {
  let soluong = 0;
  let tongtien = 0;
  monhang.innerHTML = "";

  sanpham.forEach(function (mon) {
    const vitri = mon.id;
    const soLuongMon = giohang[vitri];
    if (soLuongMon > 0) {
      soluong += soLuongMon;
      tongtien += mon.gia * soLuongMon;
      monhang.innerHTML += `
        <li>
          <span>${vanBanHTML(mon.ten)}</span>
          <div class="tangiam" role="group" aria-label="Số lượng ${vanBanHTML(mon.ten)}">
            <button type="button" data-vitri="${vanBanHTML(vitri)}" data-doi="-1" aria-label="Bớt một ${vanBanHTML(mon.ten)}">−</button>
            <span aria-label="Số lượng">${soLuongMon}</span>
            <button type="button" data-vitri="${vanBanHTML(vitri)}" data-doi="1" ${soLuongMon >= mon.ton ? "disabled" : ""} aria-label="Thêm một ${vanBanHTML(mon.ten)}">+</button>
          </div>
        </li>`;
    }
  });

  if (soluong === 0) {
    monhang.innerHTML = "<li>Giỏ hàng đang trống.</li>";
  }

  datdon.hidden = soluong === 0;
  document.getElementById("soluong").textContent = soluong;
  document.getElementById("tongtien").textContent = tienViet(tongtien);
}

danhsach.addEventListener("click", function (suKien) {
  const vitri = suKien.target.closest("button")?.dataset.vitri;
  if (vitri !== undefined && !dangDat) {
    const mon = sanpham.find(function (mon) { return mon.id === vitri; });
    const soLuong = giohang[vitri] || 0;
    if (soLuong >= mon.ton) {
      thongbao.textContent = "Bạn đã thêm hết số lượng còn trong kho.";
      return;
    }
    thongbao.textContent = "";
    giohang[vitri] = soLuong + 1;
    hienGioHang();
  }
});

monhang.addEventListener("click", function (suKien) {
  const nutBam = suKien.target.closest("button");
  if (!nutBam || dangDat || nutBam.disabled) return;
  const vitri = nutBam.dataset.vitri;
  const thayDoi = Number(nutBam.dataset.doi);
  const mon = sanpham.find(function (mon) { return mon.id === vitri; });
  if (!mon || !giohang[vitri] || (thayDoi !== 1 && thayDoi !== -1)) return;
  if (thayDoi === 1 && giohang[vitri] >= mon.ton) {
    thongbao.textContent = "Bạn đã thêm hết số lượng còn trong kho.";
    return;
  }
  thongbao.textContent = "";
  giohang[vitri] += thayDoi;
  if (giohang[vitri] === 0) delete giohang[vitri];
  hienGioHang();
  const cacNut = monhang.querySelectorAll("button");
  let nutFocus;
  cacNut.forEach(function (nut) {
    if (nut.dataset.vitri === vitri && !nut.disabled) {
      if (!nutFocus || nut.dataset.doi === String(thayDoi)) nutFocus = nut;
    }
  });
  if (!nutFocus) nutFocus = monhang.querySelector("button");
  if (!nutFocus) nutFocus = document.querySelector('.menu a[href="#giohang"]');
  if (nutFocus) nutFocus.focus();
});

tim.addEventListener("input", hienSanPham);
nhom.addEventListener("change", hienSanPham);


async function taiSanPham() {
  const phanHoi = await fetch("/api/san-pham");
  if (!phanHoi.ok) throw new Error("Không tải được sản phẩm.");
  const duLieu = await phanHoi.json();
  sanpham = duLieu.sanPham;
  const nhomDaChon = nhom.value;
  nhom.length = 1;
  duLieu.danhMuc.forEach(function (muc) {
    nhom.add(new Option(muc.ten, muc.ten));
  });
  nhom.value = nhomDaChon;
  hienSanPham();
}

datdon.addEventListener("submit", async function (suKien) {
  suKien.preventDefault();
  if (dangDat) return;
  dangDat = true;
  const nutDat = datdon.querySelector("button");
  nutDat.disabled = true;
  thongbao.textContent = "Đang đặt hàng…";

  const duLieu = Object.fromEntries(new FormData(datdon));
  duLieu.hang = sanpham.filter(function (mon) {
    return giohang[mon.id] > 0;
  }).map(function (mon) {
    return { id: mon.id, soLuong: giohang[mon.id] };
  });

  try {
    const phanHoi = await fetch("/api/don-hang", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(duLieu)
    });
    const ketQua = await phanHoi.json();
    if (!phanHoi.ok) {
      thongbao.textContent = ketQua.loi;
      return;
    }
    duLieu.hang.forEach(function (mon) { delete giohang[mon.id]; });
    datdon.reset();
    hienGioHang();
    thongbao.textContent = "Đã thanh toán đơn #" + ketQua.maDon + " · " + tienViet(ketQua.tongTien) + " · Đơn đã hoàn thành.";
    try {
      await taiSanPham();
    } catch {
      thongbao.textContent += " · Tải lại trang để cập nhật tồn kho.";
    }
  } catch {
    thongbao.textContent = "Không nhận được phản hồi từ máy chủ.";
  } finally {
    dangDat = false;
    nutDat.disabled = false;
  }
});

danhsach.textContent = "Đang tải sản phẩm…";
hienGioHang();
taiSanPham().catch(function () {
  danhsach.textContent = "Không tải được sản phẩm. Hãy mở trang qua máy chủ Node.js.";
});


// Đo header vì menu có thể xuống dòng khi thu nhỏ màn hình hoặc đăng nhập.
const dauTrang = document.querySelector('header');
function doHeader() {
  document.documentElement.style.setProperty('--caoheader', dauTrang.offsetHeight + 'px');
}
doHeader();
new ResizeObserver(doHeader).observe(dauTrang);

// Banner ba ảnh: tự chuyển sau 2 giây, có thể chọn từng ảnh.
(function () {
  const khung = document.querySelector('.anhbanner');
  const cacAnh = Array.from(khung.querySelectorAll('.anhchuyen'));
  const cacNut = Array.from(khung.querySelectorAll('.chamanh button'));
  const nguon = document.getElementById('nguonbanner');
  let viTri = 0;
  let henGio;
  khung.querySelector('.dieukhienbanner').hidden = false;
  function hienAnh(so) {
    viTri = so;
    cacAnh.forEach(function (anh, i) {
      anh.classList.toggle('hien', i === so);
      anh.setAttribute('aria-hidden', String(i !== so));
      cacNut[i].setAttribute('aria-pressed', String(i === so));
    });
    nguon.href = cacAnh[so].dataset.nguon;
    nguon.textContent = cacAnh[so].dataset.tacgia;
  }
  function batDau() {
    clearInterval(henGio);
    if (!document.hidden) {
      henGio = setInterval(function () { hienAnh((viTri + 1) % cacAnh.length); }, 2000);
    }
  }
  cacNut.forEach(function (nut, i) {
    nut.addEventListener('click', function () { hienAnh(i); batDau(); });
  });
  document.addEventListener('visibilitychange', batDau);
  batDau();
})();
