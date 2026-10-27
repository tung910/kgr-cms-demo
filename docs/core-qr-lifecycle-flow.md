# Luồng QR lõi lọc: up lõi, cấu hình tuổi thọ, thay lõi, thu hồi

Sơ đồ theo logic code hiện tại (spec §9 trong `CMS_QnA_V1_SPEC.md`). Phần thay lõi
(quét QR) chạy ở app OneKangaroo và backend; CMS chỉ giữ dữ liệu và trạng thái.

```mermaid
flowchart TD
  subgraph A["1. Up lõi (nhập lô QR)"]
    A1[Kho vận / Nhà máy bấm 'Lô mới'] --> A2[Chọn loại lõi + khu vực<br/>miền hoặc vùng nước đặc thù, có thể để sau]
    A2 --> A3[Upload CSV: serial,key]
    A3 --> A4{Kiểm tra từng dòng}
    A4 -->|thiếu serial/key, sai định dạng,<br/>trùng trong file, đã nhập trước đó| A5[Từ chối dòng, liệt kê lý do]
    A4 -->|hợp lệ| A6[Tạo lô mã tự sinh QR-Bxxxx<br/>các mã trạng thái Chưa dùng]
    A6 --> A7[Lô ở trạng thái tuổi thọ: Chờ xác nhận<br/>dùng tuổi thọ chuẩn của loại lõi]
  end

  subgraph B["2. Cấu hình tuổi thọ"]
    B0[R&D / Admin chỉnh loại lõi:<br/>tuổi thọ chuẩn tháng + giờ, mức sàn %] --> B3
    A7 --> B1{Lô đã có khu vực?}
    B1 -->|chưa| B2[Khai báo khu vực + ghi chú]
    B2 --> B3
    B1 -->|rồi| B3[Xác nhận / Điều chỉnh tuổi thọ lô<br/>sàn ≤ giá trị ≤ chuẩn, cần lý do nếu rút ngắn]
    B3 --> B4[Lô: Đã xác nhận<br/>ghi nhật ký thay đổi]
  end

  subgraph C["3. Thay lõi (kích hoạt mã)"]
    C1[Khách quét QR trên app] --> C2{Mã tồn tại,<br/>chưa dùng, đúng loại lõi,<br/>lô chưa thu hồi?}
    C2 -->|không| C3[Cảnh báo nghi hàng giả<br/>CMS ghi nhận]
    C2 -->|có| C4[Mã chuyển Đã dùng<br/>ghi thời điểm, thiết bị, khách]
    C4 --> C5{Lô đã xác nhận<br/>lúc kích hoạt?}
    C5 -->|rồi| C6[Khóa tuổi thọ của lô]
    C5 -->|chưa| C7[Khóa tuổi thọ chuẩn của loại lõi]
    C6 --> C8[Reset đồng hồ lõi + cộng điểm loyalty]
    C7 --> C8
    C8 --> C9[Các lần xác nhận / chỉnh sau đó<br/>KHÔNG áp dụng ngược cho lõi đã kích hoạt]
  end

  subgraph D["4. Thu hồi lô"]
    D1[Admin / Nhà máy / Kho vận bấm 'Thu hồi lô'] --> D2{Lô đã thu hồi?}
    D2 -->|rồi| D3[Báo lỗi 409]
    D2 -->|chưa| D4[Nhập lý do bắt buộc]
    D4 --> D5[Lô: Đã thu hồi<br/>mọi mã trong lô thành Thu hồi]
    D5 --> D6[Mã bị từ chối kích hoạt toàn hệ thống]
  end

  A6 -.-> C1
  B4 -.-> C5
  D5 -.-> C2
```

## Điểm cần lưu ý

- **Thu hồi:** đổi trạng thái cả lô trong mock, kể cả các mã đã dùng. Chỉ chặn các
  lần kích hoạt tiếp theo, không hoàn lại lõi đã kích hoạt.
- **Lô đã thu hồi:** không khai báo khu vực hay chỉnh tuổi thọ được nữa
  (`batchAlreadyRecalled`).
- **Vô hiệu hóa:** spec §9.6 có vô hiệu hóa từng mã hoặc lô; code hiện chỉ thu hồi
  theo lô.
