# Gói dịch vụ gắn theo thiết bị (quyền lợi dịch vụ)

Ngày: 27/10/2026 · Trạng thái: chờ chủ sản phẩm duyệt · Liên quan:
`docs/SERVICE_PACKAGE_CATALOG.md`, `docs/CMS_QnA_V1_SPEC.md` (2.3, 2.4, 3.4b,
9.3, 9.5).

Ký hiệu: **[Đã chốt]** là quyết định của chủ sản phẩm trong buổi trao đổi;
**[Đề xuất]** là lựa chọn của người viết, cần chủ sản phẩm kiểm tra khi đọc;
**[Giả định ⚠️]** là điểm ảnh hưởng phân quyền/hợp đồng, cần nghiệp vụ ký duyệt
trước khi có backend thật.

## 1. Mục đích

Danh mục gói dịch vụ hiện chỉ định nghĩa *gói là gì*. Chưa có khái niệm *một
chiếc máy cụ thể được hưởng gói nào, còn bao lâu, đã dùng bao nhiêu*. Tính năng
này gắn gói vào từng máy ngay khi máy được nhập kho, để:

- khách mua máy và kết nối thành công trên app thấy ngay mình đang có gói gì,
  còn hạn đến bao giờ, còn bao nhiêu lượt;
- CSKH trả lời được "máy tôi còn gói gì, còn mấy lượt" ngay trong cuộc gọi, từ
  danh sách và chi tiết thiết bị;
- KGR theo dõi được việc sử dụng gói và đối soát được máy nào đã được hứa gì.

Thời điểm bán (đại lý/cửa hàng giao máy) không được ghi nhận trong hệ thống nên
không tham gia vào luồng này **[Đã chốt]**.

## 2. Mục tiêu, không phải mục tiêu, phản mục tiêu

**Mục tiêu**

1. Tự động gắn gói vào máy khi đồng bộ kho, theo quy tắc đặt trên gói.
2. Thời hạn gói tính từ ngày kích hoạt thiết bị.
3. Hiển thị gói ở danh sách thiết bị (cả tab Đang sử dụng và Trong kho) và
   khối "Gói dịch vụ" trong chi tiết thiết bị.
4. Theo dõi sử dụng: đếm lượt, giữ chỗ theo phiếu dịch vụ (kể cả phiếu thay
   lõi tạo từ portal), ghi nhận gửi lõi, ghi nhận tay, hoàn lượt, lịch sử sử
   dụng.
5. Điều chỉnh có kiểm soát: gắn/gỡ hàng loạt cho máy chưa kích hoạt; thêm gói
   bù đắp và hoàn lượt cho máy đã kích hoạt. Mọi thao tác ghi audit bất biến.
6. Hợp đồng dữ liệu cho app OneKangaroo và cho màn Lịch dịch vụ (2.4) sau này.

**Không phải mục tiêu (lần này)**

- Màn Lịch dịch vụ / quản lý phiếu (2.4). Ngoài luồng tạo phiếu thay lõi đã
  có (mục 6.3), phiếu chỉ được giả lập trong MSW để hiển thị giữ chỗ.
- Cộng gói bảo hành vào bảo hành điện tử (mục 6.4).
- Code app OneKangaroo; backend thật. Repo này chỉ có frontend + MSW.
- Khách mua thêm gói sau khi mua máy (bán gói có thu tiền), thanh toán,
  auto-debit.
- Gói gắn theo *người* (tài khoản khách) thay vì theo máy.
- Gói kết hợp (nhóm `bundle`: TG-ALL, TG-SUB) tự gắn khi nhập kho
  **[Đề xuất]** — TG-ALL cần tách thành nhiều quyền lợi thành phần, TG-SUB là
  thuê/thuê bao có thu tiền. Để đợt sau.
- Nhắc hạn/nhắc lượt cho khách qua push hay chiến dịch tự động (7.3).
- Bộ lọc "Gói dịch vụ" và cột gói trong file xuất CSV danh sách thiết bị
  **[Đề xuất]**.
- Màn sửa gói trong danh mục.

**Phản mục tiêu (dù chạy được vẫn là thất bại)**

- Quyền lợi của máy tự thay đổi khi danh mục gói thay đổi.
- Khách bị trừ lượt khi tự thay lõi (quét QR).
- Có thao tác sửa hoặc xoá lịch sử sử dụng / audit từ UI.
- Thời hạn bị "ăn" trong thời gian máy nằm kho.

## 3. Khái niệm

- **Gói (package)**: mục trong danh mục `/service-packages`, đã có.
- **Quyền lợi (entitlement)**: một gói đã gắn vào một máy (serial). Một máy có
  thể có nhiều quyền lợi. Quyền lợi lưu **bản chụp** của gói tại thời điểm gắn
  (mã, tên, loại, nhóm, cấu hình, thời hạn, số lượt) — không tham chiếu sống
  tới gói **[Đã chốt: máy giữ gói như lúc nhập]**.
- **Lượt**: một lần KGR thực hiện dịch vụ trong quyền lợi có đếm lượt.
- **Sự kiện sử dụng (usage event)**: bản ghi bất biến về giữ chỗ, sử dụng, trả
  lượt, hoàn lượt hoặc lần dùng của quyền lợi chỉ theo hạn.

## 4. Quy tắc gắn gói khi nhập kho

### 4.1. Cấu hình trên gói [Đã chốt]

Không có màn quy tắc riêng. Gói có thêm hai trường:

- `auto_attach` (bool) — "Tự động gắn khi nhập kho".
- `auto_attach_from` (ngày) — áp dụng cho máy đồng bộ từ ngày này.

Phạm vi model dùng chính `model_scope` / `eligible_model_ids` của gói.

Điều kiện để bật `auto_attach`:

- `pricing_mode = free_or_included` **[Đã chốt]**;
- gói có cấu hình đầy đủ (`details` khác `null`);
- nhóm khác `bundle` **[Đề xuất]**;
- gói có thời hạn xác định (`term_months` khác `null`), trừ loại "một lần"
  (mục 5.1) được phép không có thời hạn **[Đề xuất]**.

Nơi bật/tắt:

- Form tạo gói (`/service-packages/new`): ô chọn + ngày hiệu lực, chỉ hiện khi
  điều kiện trên thỏa; hiện trong bản xem lại.
- Danh sách gói: hành động "Bật/Tắt tự gắn" trên từng dòng (cần
  `service_package.write`). Bật yêu cầu ngày hiệu lực (không được trước hôm
  nay **[Đề xuất]**); bật và tắt đều yêu cầu lý do, ghi audit trước/sau.
- Danh sách gói có thêm nhãn "Tự gắn từ dd/mm/yyyy" trên dòng gói đang bật.

### 4.2. Khi đồng bộ kho

Với mỗi máy **mới được thêm** trong lần đồng bộ (không áp dụng cho máy chỉ
được cập nhật), gắn mọi gói thỏa đồng thời:

- `status = active`, `auto_attach = true`;
- `auto_attach_from` ≤ thời điểm đồng bộ;
- model của máy nằm trong phạm vi model của gói.

Quyền lợi mới ở trạng thái **Chưa bắt đầu**, actor audit là hệ thống với nguồn
"Đồng bộ kho <synced_at>". Kết quả đồng bộ trả thêm số quyền lợi đã gắn; thông
báo thành công hiển thị thêm "gắn N gói dịch vụ".

Đồng bộ kho và gắn hàng loạt không gắn một gói cho máy đã có gói đó (chỉ
"Thêm gói" ở mục 7.2 được phép).

### 4.3. Không hồi tố [Đã chốt]

- Máy đã nằm kho trước ngày hiệu lực không tự nhận gói. Gắn bù dùng thao tác
  hàng loạt (mục 7.1).
- Gói bị ngừng bán (`archived`) hoặc tắt tự gắn: ngừng gắn cho máy nhập mới;
  máy đã gắn vẫn giữ nguyên.
- Đổi nội dung gói: tạo gói mới (nguyên tắc sẵn có của danh mục).

## 5. Quyền lợi trên một máy

### 5.1. Ba kiểu theo loại gói

| Kiểu | Loại gói | Số lượt |
|---|---|---|
| Một lần | LD-STD, LD-PRO, TH-OLD | 1 |
| Có số lượt | BT-FIL, CS-WQ | `floor(term_months / interval)` **[Đề xuất]** |
| Có số lượt | BT-CLN | `visits` (đã có trong cấu hình) |
| Có số lượt | BT-COR | 1 **[Đề xuất]** |
| Chỉ theo hạn | BH-EXT, BH-ADP, BH-CMP, CS-VIP, CS-APP | không đếm lượt |

Số lượt được tính một lần lúc gắn và lưu vào bản chụp. Nếu công thức cho ra 0
thì gói không được bật tự gắn (form báo lỗi).

### 5.2. Thời hạn [Đã chốt]

- Bắt đầu = ngày kích hoạt thiết bị (IoT: lần kết nối cloud đầu tiên; không
  IoT: kích hoạt bảo hành bằng serial/QR).
- Kết thúc = bắt đầu + `term_months`. Loại một lần không có thời hạn thì không
  hết hạn cho tới khi dùng.
- Lượt kế tiếp đến hạn (kiểu có chu kỳ) = bắt đầu + k × `interval`, với k là số
  lượt đã dùng + 1 **[Đề xuất]**. Chỉ là thông tin gợi ý, không chặn việc dùng
  sớm hay muộn.
- Lượt chưa dùng mất khi hết hạn **[Đề xuất]**. Lượt đang giữ chỗ trước ngày
  hết hạn vẫn được trừ nếu phiếu hoàn thành sau ngày hết hạn **[Đề xuất]**.

### 5.3. Trạng thái

| Trạng thái | Điều kiện |
|---|---|
| Chưa bắt đầu | máy chưa kích hoạt |
| Đang hiệu lực | đã kích hoạt, chưa hết hạn, còn lượt (hoặc chỉ theo hạn) |
| Sắp hết hạn | đang hiệu lực và còn ≤ 30 ngày (cùng ngưỡng bảo hành 2.3) |
| Hết lượt | đã dùng hết lượt, chưa hết hạn |
| Hết hạn | quá ngày kết thúc |
| Đã gỡ | gỡ khỏi máy chưa kích hoạt bằng thao tác hàng loạt |

"Sắp hết hạn" và "Hết hạn" do server tính tại thời điểm đọc; client không tự
suy diễn từ ngày. Khi nhiều điều kiện cùng đúng, server trả một trạng thái theo
thứ tự ưu tiên **[Đề xuất]**: Đã gỡ > Hết hạn > Hết lượt > Sắp hết hạn > Đang
hiệu lực > Chưa bắt đầu. Quyền lợi một lần đã dùng là "Hết lượt". Sau hoàn
lượt, trạng thái được tính lại. Bộ giá trị trạng thái dùng ở cả danh sách và chi tiết thiết
bị, theo quy ước hằng số dùng chung (`{ value, labelKey }`, nhãn i18n).

### 5.4. Đổi chủ [Đã chốt]

Quyền lợi đi theo máy. Hạn không reset, lượt đã dùng giữ nguyên. Chủ cũ mất
quyền xem cùng lúc mất quyền với máy. Hộp thoại đổi/xoá chủ (3.4b) hiện thêm
dòng "N gói dịch vụ còn hiệu lực sẽ chuyển theo máy", và nội dung thông báo cho
chủ cũ có thêm ý này. Không thêm bước xác nhận mới.

## 6. Theo dõi sử dụng

### 6.1. Nguyên tắc [Đã chốt]

Chỉ trừ lượt khi **KGR thực hiện**. Khách tự làm không trừ.

| Sự kiện | Tác động |
|---|---|
| Phiếu dịch vụ gắn với quyền lợi được tạo (Chờ xác nhận / Đã phân công / Đang xử lý) | Giữ chỗ 1 lượt |
| Phiếu chuyển Hoàn thành | Lượt giữ chỗ → đã dùng |
| Phiếu chuyển Hủy | Trả lượt giữ chỗ |
| Nhân viên "Ghi nhận gửi lõi" (BT-FIL giao `self`, BT-COR giao `shipment`) | Trừ 1 lượt |
| Khách quét QR lõi (9.5) | Chỉ reset đồng hồ lõi, không trừ lượt |
| Nhân viên "Ghi nhận sử dụng" tay | Trừ 1 lượt |
| Nhân viên "Hoàn lượt" | Cộng lại 1 lượt cho một sự kiện đã dùng cụ thể |

Với quyền lợi chỉ theo hạn: các sự kiện trên được ghi vào lịch sử nhưng không
đổi số lượt.

### 6.2. Ràng buộc

- Không giữ chỗ / ghi nhận khi quyền lợi không ở trạng thái Đang hiệu lực hoặc
  Sắp hết hạn, hoặc khi `đã dùng + đang giữ chỗ ≥ số lượt`.
- Ghi nhận gửi lõi bắt buộc ít nhất một trong: mã vận đơn, mã QR lõi đã gửi.
  Nếu nhập mã QR, mã phải tồn tại trong hệ thống QR lõi **[Đề xuất]**. Kèm ghi
  chú tuỳ chọn.
- Ghi nhận tay bắt buộc lý do chọn từ danh mục (ví dụ: tổng đài xử lý, dịch vụ
  tại trung tâm, khác) và ghi chú.
- Hoàn lượt bắt buộc chọn sự kiện đã dùng cần hoàn và lý do; một sự kiện chỉ
  hoàn được một lần. Đây là bút toán bù, không xoá sự kiện gốc.
- Lịch sử sử dụng không sửa/xoá được từ UI.
- Lần quét QR của khách trên máy được hiện trong lịch sử của quyền lợi thay lõi
  với nhãn "không trừ lượt" để CSKH giải thích **[Đề xuất]**.

### 6.3. Phiếu dịch vụ

Phiếu có thêm trường `entitlement_id` (nullable). Backend giữ/trừ/trả lượt khi
phiếu được tạo hoặc đổi trạng thái — không có API riêng để giữ chỗ.

**Tạo phiếu từ cảnh báo lõi [Đã chốt]**: portal đã có luồng tạo phiếu thay lõi
từ khối cảnh báo lõi (`DeviceCoreAlertsPanel` →
`POST /devices/{id}/service-tickets`). Hộp thoại này thêm mục "Dùng gói dịch
vụ":

- chỉ hiện khi máy có quyền lợi thay lõi (BT-FIL hoặc BT-COR) giao bằng
  **kỹ thuật viên**, đang hiệu lực/sắp hết hạn và còn lượt
  (`quota − used − reserved > 0`);
- có một quyền lợi phù hợp thì chọn sẵn; có nhiều thì người dùng chọn; luôn có
  lựa chọn "Không dùng gói (khách trả phí)";
- request gửi thêm `entitlement_id` (hoặc `null`); server kiểm tra lại ràng
  buộc mục 6.2 và giữ chỗ 1 lượt; lỗi trả mã có tên (mục 11);
- tạo phiếu thành công thì làm mới khối "Gói dịch vụ".

Quyền tạo phiếu giữ nguyên như hiện tại; chọn gói không cần quyền thêm.

**Phần chỉ mock**: không có màn quản lý phiếu, không đổi trạng thái phiếu
(Hoàn thành/Hủy) trên portal. MSW có sẵn vài phiếu ở các trạng thái khác nhau
gắn với quyền lợi trong fixture để khối chi tiết hiển thị được "đang giữ chỗ —
phiếu SR-xxxx, trạng thái, ngày hẹn" và lịch sử đã dùng/trả lượt.

### 6.4. Gói bảo hành và bảo hành điện tử [Đã chốt]

Quyền lợi nhóm bảo hành (BH-EXT, BH-ADP, BH-CMP) **tách riêng** khỏi bảo hành
điện tử (2.3): không đổi ngày hết hạn bảo hành điện tử, không đụng màn/hợp đồng
bảo hành. Để CSKH không nhầm hai ngày hết hạn, thẻ và khối chi tiết của quyền
lợi bảo hành ghi rõ "Bảo hành bổ sung theo gói — độc lập với bảo hành điện tử
(hết hạn dd/mm/yyyy)", với ngày bảo hành điện tử lấy từ dữ liệu thiết bị đã có.

## 7. Điều chỉnh

### 7.1. Gắn/gỡ hàng loạt cho máy chưa kích hoạt

Ở tab Trong kho:

- Chọn máy bằng ô chọn từng dòng **hoặc** "áp dụng cho toàn bộ kết quả lọc"
  (lọc theo model, lô, khoảng ngày nhập kho).
- Chọn thao tác: Gắn gói (chọn gói `active`, đủ cấu hình, khác `bundle`,
  `free_or_included`; model của máy phải nằm trong phạm vi gói) hoặc Gỡ gói.
- Bước xem trước: số máy bị ảnh hưởng, số máy bị bỏ qua và lý do (đã có gói,
  model ngoài phạm vi, đã kích hoạt).
- Lý do bắt buộc. Ghi một audit cho thao tác (bộ lọc/danh sách, gói, số máy) và
  một mục lịch sử trên từng quyền lợi.
- Máy đã kích hoạt luôn bị bỏ qua.

### 7.2. Máy đã kích hoạt

Trên chi tiết thiết bị:

- **Thêm gói** (bù đắp/chính sách): chọn gói, lý do bắt buộc. Gói chọn được
  theo cùng điều kiện với mục 7.1. Được phép thêm một gói máy đang có — tạo
  quyền lợi riêng, đây là cách cấp thêm lượt bù đắp **[Đề xuất]**. Thời hạn
  tính từ ngày thêm **[Đề xuất]** (không lùi về ngày kích hoạt).
- **Hoàn lượt**: như mục 6.2.
- Không gỡ, không sửa hạn quyền lợi đã kích hoạt trong lần này.

## 8. Giao diện

### 8.1. Danh sách thiết bị — phương án A [Đã chốt]

- Tab Đang sử dụng: cột "Gói dịch vụ" sau cột Lõi lọc, mỗi quyền lợi một
  thẻ (tag): tên ngắn + thông tin theo trạng thái (mục 5.3): "Hết lượt", "Sắp
  hết hạn: còn N ngày", "x/y lượt" (đang hiệu lực, có lượt), hoặc chỉ tên. Hết hạn và đã gỡ
  không hiện. Không có gói: "—". Quá 2 thẻ: hiện 2 thẻ + "+N".
- Tab Trong kho: cùng cột, thẻ màu xám "Chưa bắt đầu".
- Màu thẻ dùng tone sẵn có của portal (đang hiệu lực / cảnh báo / trung tính).

### 8.2. Chi tiết thiết bị — khối "Gói dịch vụ"

Theo mockup đã xem. Với mỗi quyền lợi:

- tên, mã gói, nhóm, kiểu giao (nếu có), trạng thái;
- khoảng hiệu lực, thời gian còn lại;
- với kiểu có lượt: thanh tiến độ, "đã dùng x/y", "đang giữ chỗ n — phiếu
  SR-xxxx (trạng thái, ngày hẹn)", lượt kế tiếp đến hạn;
- nút theo quyền và theo kiểu: Ghi nhận gửi lõi (chỉ BT-FIL `self` / BT-COR
  `shipment`), Ghi nhận sử dụng, Hoàn lượt;
- lịch sử sử dụng (mới nhất trước), mỗi dòng: thời gian, loại sự kiện, tham
  chiếu (phiếu / vận đơn / QR), người thực hiện;
- dòng nguồn: gắn bởi quy tắc của gói nào, đợt đồng bộ nào, hoặc thao tác điều
  chỉnh nào; liên kết tới audit.

Đầu khối có nút "Thêm gói" (máy đã kích hoạt, theo quyền). Khối hiện cho cả
máy IoT và không IoT.

Máy trong kho hiện chưa có trang chi tiết (dòng ở tab Trong kho không mở được).
Lần này **không** làm trang chi tiết cho máy trong kho **[Đề xuất]**: quyền lợi
"Chưa bắt đầu" chỉ hiện ở cột của danh sách kho, rê chuột vào thẻ để xem tên
gói, nguồn gắn và thời hạn sẽ tính khi kích hoạt.

### 8.3. Danh mục gói

- Form tạo gói: mục "Tự động gắn khi nhập kho" (mục 4.1).
- Danh sách gói: nhãn "Tự gắn từ …" và hành động Bật/Tắt tự gắn.

### 8.4. Đổi chủ

Dòng thông tin trong hộp thoại đổi/xoá chủ (mục 5.4).

## 9. Phân quyền [Giả định ⚠️]

Không có dòng tương ứng trong ma trận spec; đặt theo các quyền gần nhất và cần
nghiệp vụ duyệt. Ẩn hẳn khi không có quyền.

| Thao tác | Capability | Vai trò |
|---|---|---|
| Xem quyền lợi (danh sách + chi tiết) | `device.read` (sẵn có) | như xem thiết bị |
| Bật/tắt tự gắn trên gói | `service_package.write` (sẵn có) | super, admin, sales |
| Ghi nhận gửi lõi / ghi nhận sử dụng | `service_entitlement.record` (mới) | super, admin, TT DV — như `service.write` (2.4b) |
| Hoàn lượt, thêm gói cho máy đã kích hoạt | `service_entitlement.adjust` (mới) | super, admin, TT DV — như `warranty.update` (2.3b) |
| Gắn/gỡ hàng loạt máy trong kho | `service_entitlement.bulk_assign` (mới) | super, admin |

Quyền lợi không chứa PII khách. Lịch sử hiển thị tên nhân viên thực hiện; tên
khách trong phiếu không hiển thị trong khối này.

## 10. Audit

Thêm module audit `service_entitlements`. Ghi (actor, thời điểm, đối tượng,
trước/sau, lý do) cho: gắn tự động khi đồng bộ, bật/tắt tự gắn, gắn/gỡ hàng
loạt, thêm gói, ghi nhận gửi lõi, ghi nhận sử dụng, hoàn lượt. Giữ chỗ/trả lượt
từ phiếu được ghi trong lịch sử quyền lợi với actor là hệ thống, tham chiếu
phiếu.

## 11. Hợp đồng dữ liệu (đề xuất cho backend)

Quy ước sẵn có: DTO snake_case, parse Zod tại biên API, map sang domain
camelCase, ngày ISO có offset.

**Gói** — thêm `auto_attach: boolean`, `auto_attach_from: string | null`.
Dữ liệu cũ thiếu trường → coi là `false` / `null`.

- `POST /service-packages/{id}/auto-attach` — body
  `{ enabled, from, reason, changes[] }`.

**Đồng bộ kho** — `POST /devices/inventory/sync` trả thêm
`entitlements_attached: number`.

**Quyền lợi**

```
EntitlementDto {
  id, device_id,
  package_snapshot: { package_id, code, name, group, service_type_code,
                      delivery: 'self'|'technician'|'shipment'|null,
                      term_months: number|null, interval_months: number|null },
  kind: 'one_time'|'counted'|'time_only',
  quota: number|null,            // null với time_only
  used: number, reserved: number,
  status: 'pending'|'active'|'expiring'|'exhausted'|'expired'|'revoked',
  starts_at: string|null, ends_at: string|null, next_due_at: string|null,
  source: { kind: 'auto_attach'|'bulk_assign'|'manual_add',
            reference: string, at: string },
  open_reservations: [{ ticket_id, ticket_code, ticket_status, scheduled_at }]
}

EntitlementEventDto {
  id, entitlement_id,
  type: 'reserved'|'released'|'consumed'|'shipment'|'manual'|'reversal'
        |'customer_qr_scan'|'attached'|'revoked',
  counts_against_quota: boolean,
  reference: { ticket_code?, tracking_code?, core_qr_code?, reversed_event_id? },
  reason: string|null, note: string|null,
  actor: { kind: 'staff'|'system', name: string },
  occurred_at: string
}
```

- `GET /devices/{id}/entitlements` → `EntitlementDto[]`.
- `GET /entitlements/{id}/events` → `EntitlementEventDto[]` (phân trang).
- `POST /entitlements/{id}/shipments` — `{ tracking_code?, core_qr_code?, note? }`.
- `POST /entitlements/{id}/usages` — `{ reason_code, note }`.
- `POST /entitlements/{id}/reversals` — `{ event_id, reason }`.
- `POST /devices/{id}/entitlements` — `{ package_id, reason }` (máy đã kích
  hoạt).
- `POST /devices/inventory/entitlements/bulk` — `{ action: 'attach'|'revoke',
  package_id, device_ids? | filters?, reason, dry_run }`; `dry_run: true` trả
  số ảnh hưởng/bỏ qua cho bước xem trước.
- Danh sách thiết bị và danh sách kho: mỗi dòng có thêm
  `entitlements_summary: [{ id, name, kind, status, used, quota, ends_at }]`
  (không gồm `revoked`/`expired`). Dữ liệu cũ thiếu trường → mảng rỗng.

Mọi lệnh ghi trả quyền lợi sau cập nhật; giá trị server thắng. Lỗi nghiệp vụ
dùng mã lỗi có tên (ví dụ `entitlement_exhausted`, `entitlement_not_active`,
`already_reversed`, `core_qr_not_found`) để client hiển thị thông điệp i18n.

**Phiếu dịch vụ** — thêm `entitlement_id: string | null` vào phiếu và vào body
`POST /devices/{id}/service-tickets` (cạnh `reason`, `core_position`). Lỗi:
`entitlement_exhausted`, `entitlement_not_active`, `entitlement_not_eligible`
(sai loại/sai kiểu giao/không thuộc máy).

**App OneKangaroo (chỉ mô tả)** — sau khi kết nối thành công, app cần đọc cho
máy: tên gói, nhóm, trạng thái, ngày bắt đầu/kết thúc, số lượt còn lại, lượt
kế tiếp đến hạn, các mục "bao gồm/không bao gồm" từ bản chụp gói. Khi khách đặt
lịch, app gửi `entitlement_id` nếu khách chọn dùng gói; app không được cho
chọn quyền lợi hết lượt/hết hạn. Cập nhật danh mục phải tới app trong vài phút
(nguyên tắc chung của portal).

## 12. Mock (MSW)

- Fixture: một số máy đang sử dụng có quyền lợi ở đủ trạng thái (đang hiệu
  lực, sắp hết hạn, hết lượt, hết hạn), có phiếu giữ chỗ, có lịch sử gồm gửi
  lõi, ghi nhận tay, hoàn lượt, quét QR "không trừ lượt"; máy không IoT có quyền
  lợi; máy trong kho có quyền lợi "Chưa bắt đầu".
- Ít nhất 2 gói `DEMO-*` trong fixture bật tự gắn để lần bấm Đồng bộ gắn được
  gói cho máy mới.
- Handler kiểm tra capability và các ràng buộc ở mục 6.2/7, ghi audit trong bộ
  nhớ như các handler hiện có.
- Handler `POST /devices/{id}/service-tickets` nhận `entitlement_id`, kiểm tra
  ràng buộc và tạo sự kiện giữ chỗ.
- Có ít nhất một máy có cảnh báo lõi và quyền lợi thay lõi giao bằng kỹ thuật
  viên còn lượt, để thử luồng tạo phiếu có chọn gói.
- Không giả lập sự kiện kích hoạt (chuyển máy từ kho sang đang sử dụng).

## 13. Ràng buộc kỹ thuật

- Theo `AGENTS.md`, `docs/CODING_CONVENTIONS.md`, `docs/SCREEN_WORKFLOW.md`:
  vertical slice, Zod tại biên API, capability qua `hasCapability` /
  `PermissionGuard`, i18n vi/en, không sửa `routeTree.gen.ts` bằng tay.
- Không thêm dependency, không thêm framework kiểm thử.
- Kiểm tra bắt buộc: `pnpm lint`, `pnpm typecheck`, `pnpm format:check`,
  `pnpm build`; thử luồng trên trình duyệt với MSW.
- Quy mô thiết kế 100k+ thiết bị: tóm tắt quyền lợi đi kèm trang danh sách,
  không gọi API riêng cho từng dòng.

## 14. Để người làm tự quyết

- Quyền lợi thuộc slice nào (`devices` hay slice mới) và cách chia component.
- Danh mục lý do ghi nhận tay / hoàn lượt (danh sách cụ thể, i18n).
- Cách trình bày bước xem trước của thao tác hàng loạt.
- Phân trang lịch sử sử dụng trong khối chi tiết.
