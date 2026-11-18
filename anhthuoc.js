// Anh bao bi thuc te; nguon chi tiet trong images/nguon-anh.json.
const anhThuoc = {
  "A02": {
    "tep": "images/A02.jpg",
    "nguon": "https://nhathuoclongchau.com.vn/thuoc/vitamin-c-500mg-1373.html"
  },
  "B03": {
    "tep": "images/B03.jpg",
    "nguon": "https://nhathuoclongchau.com.vn/thuoc/babi-bon-12ml-vitamin-d-21147.html"
  },
  "A03": {
    "tep": "images/A03.jpg",
    "nguon": "https://nhathuoclongchau.com.vn/thuoc/panadol-giam-dau-ha-sot-2716.html"
  },
  "C02": {
    "tep": "images/C02.png",
    "nguon": "https://nhathuoclongchau.com.vn/thuoc/bromhexin-8-4448.html"
  },
  "B05": {
    "tep": "images/B05.jpg",
    "nguon": "https://nhathuoclongchau.com.vn/thuoc/berberin-4546.html"
  },
  "C01": {
    "tep": "images/C01.png",
    "nguon": "https://nhathuoclongchau.com.vn/thuoc/amoxicillin-500mg-domesco-4734.html"
  },
  "B01": {
    "tep": "images/B01.png",
    "nguon": "https://nhathuoclongchau.com.vn/thuoc/vitamin-e-400-iu-opc-1750.html"
  },
  "B02": {
    "tep": "images/B02.png",
    "nguon": "https://nhathuoclongchau.com.vn/thuoc/thuoc-ho-bao-thanh-125ml-496.html"
  },
  "B04": {
    "tep": "images/B04.png",
    "nguon": "https://nhathuoclongchau.com.vn/thuoc/oresol-245-dhg-20-goi-27857.html"
  },
  "A01": {
    "tep": "images/A01.png",
    "nguon": "https://www.pharmacity.vn/thuoc-ha-sot-giam-dau-paracetamol-500mg-5-vi-x-10-vien-hop.html"
  }
};

// Chỉ dùng ảnh tải lên có đường dẫn do máy chủ tạo, nếu không thì dùng ảnh cũ.
function duongDanAnh(mon) {
  if (typeof mon.anh === "string" && /^\/images\/uploads\/[0-9a-f-]{36}\.(png|jpg|webp)$/.test(mon.anh)) return mon.anh;
  return anhThuoc[mon.id] ? "/" + anhThuoc[mon.id].tep : "";
}