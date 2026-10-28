# Gói dịch vụ gắn theo thiết bị (quyền lợi dịch vụ)

Ngày: 27/10/2026 · Cập nhật: 28/10/2026 · Trạng thái: đã duyệt các quyết định tại mục 15; chi tiết phiếu/KTV và phân quyền tạm hoãn · Liên quan:
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

- Giai đoạn A chưa làm màn Lịch dịch vụ / quản lý phiếu (2.4); phiếu lắp
  đặt và trang KTV thuộc giai đoạn B (§15). Ngoài luồng tạo phiếu thay lõi đã
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
| Có số lượt | BT-FIL, CS-WQ | `floor(term_months / interval)` **[Đã chốt: mặc định]** |
| Có số lượt | BT-CLN | `visits` (đã có trong cấu hình) |
| Có số lượt | BT-COR | 1 **[Đã chốt: mặc định]** |
| Chỉ theo hạn | BH-EXT, BH-ADP, BH-CMP, CS-VIP, CS-APP | không đếm lượt |

Công thức trong bảng là mặc định. Từng gói có thể chọn `quota_mode = default`
hoặc `custom`; `custom_quota` phải là số nguyên dương khi dùng `custom`,
ngược lại là `null`. Áp dụng cho `one_time` và `counted`; `time_only` không
có tùy chỉnh lượt (`quota_mode = default`, `custom_quota = null`).
Số lượt cuối cùng được tính một lần lúc gắn và lưu vào bản chụp cùng chế độ
và giá trị tùy chỉnh. Đổi cấu hình chỉ tác động lần cấp mới. Chu kỳ không đổi
khi tùy chỉnh số lượt. Bản xem lại hiển thị cách tính, tổng lượt, thời hạn.
Nếu tổng lượt cuối cùng bằng 0
thì gói không được bật tự gắn (form báo lỗi).

### 5.2. Thời hạn [Đã chốt]

- Bắt đầu = ngày kích hoạt thiết bị (IoT: lần kết nối cloud đầu tiên; không
  IoT: kích hoạt bảo hành bằng serial/QR).
- Kết thúc = bắt đầu + `term_months`. Loại một lần không có thời hạn thì không
  hết hạn cho tới khi dùng.
- Lượt kế tiếp đến hạn (kiểu có chu kỳ) = bắt đầu + k × `interval`, với k là số
  lượt đã dùng + 1 **[Đã chốt]**. Chỉ là thông tin gợi ý, không chặn việc dùng
  sớm hay muộn. Chu kỳ không đổi theo số lượt tùy chỉnh; không hiển thị mốc
  sau ngày hết hạn.
- Lượt chưa dùng mất khi hết hạn **[Đã chốt]**. Lượt đang giữ chỗ trước ngày
  hết hạn vẫn được trừ nếu phiếu hoàn thành sau ngày hết hạn **[Đã chốt]**.
  Hủy phiếu sau hạn chỉ trả giữ chỗ, không khôi phục lượt có thể sử dụng.

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

- Giữ chỗ mới / ghi nhận trực tiếp chỉ khi Đang hiệu lực hoặc Sắp hết hạn
  và còn lượt. Không so quota với time_only. Ngoại lệ: lắp đặt trước kích
  hoạt qua phiếu KTV (§15.2). Hoàn thành phiếu đã giữ chỗ hợp lệ được phép
  sau hạn hoặc khi used + reserved = quota: chuyển reserved thành used,
  không áp dụng kiểm tra còn lượt của một yêu cầu giữ chỗ mới.
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
- Cho thu hồi gói cấp nhầm khi chưa từng sử dụng và không có giữ chỗ;
  bắt buộc lý do, giữ snapshot/lịch sử/audit và chuyển `revoked` (Đã thu hồi).
  Sự kiện sử dụng đã hoàn vẫn thuộc lịch sử đã dùng, không làm gói đủ điều
  kiện thu hồi trở lại (lựa chọn triển khai thận trọng). Gói `time_only` có
  sự kiện phục vụ cũng được coi đã dùng; quét QR không trừ lượt không tính
  là sử dụng dịch vụ. Không sửa hạn quyền lợi trong lần này.

## 8. Giao diện

### 8.1. Danh sách thiết bị — phương án A [Đã chốt]

- Tab Đang sử dụng: cột "Gói dịch vụ" sau cột Lõi lọc, mỗi quyền lợi một
  thẻ (tag): tên ngắn + thông tin theo trạng thái (mục 5.3): "Hết lượt", "Sắp
  hết hạn: còn N ngày", "x/y lượt" (đang hiệu lực, có lượt), hoặc chỉ tên. Hết hạn và đã gỡ
  không hiện. Không có gói: "—". Quá 2 thẻ: hiện 2 thẻ + "+N".
- Tab Trong kho: cùng cột, thẻ màu xám "Chưa bắt đầu"; riêng lắp đặt
  chưa dùng hiện "Chưa sử dụng", đã dùng hết hiện "Hết lượt" theo server,
  không ép nhãn dựa vào tab.
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

## 9. Phân quyền — tạm hoãn theo quyết định 28/10/2026

Chưa thêm capability hoặc thay đổi ma trận vai trò. Bảng dưới chỉ giữ làm
phương án tham khảo, không phải yêu cầu triển khai đã duyệt. Giữ kiểm tra quyền
hiện có; không thay bằng kiểm tra role hoặc mở quyền mặc định cho thao tác mới.
Các thao tác mới chưa có quyền phù hợp phải để ngoài đợt triển khai cho tới khi
chốt phân quyền. Điều kiện KTV được phân công là yêu cầu nghiệp vụ đã chốt,
không thay thế kiểm tra capability khi triển khai giai đoạn phiếu/KTV.

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

**Gói** — thêm `auto_attach: boolean`, `auto_attach_from: string | null`,
`quota_mode: default|custom`, `custom_quota: number|null`. Dữ liệu cũ thiếu
cấu hình lượt dùng `default` / `null`.
Dữ liệu cũ thiếu trường tự gắn → coi là `false` / `null`.

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
                      term_months: number|null, interval_months: number|null,
                      purpose, included_items, excluded_items,
                      eligibility_description, model_scope, eligible_model_ids,
                      pricing_mode, pricing_description, additional_cost_description,
                      configuration, quota_mode, custom_quota, quota },
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
  số ảnh hưởng/bỏ qua và `preview_id` cho bước xem trước. Xác nhận gửi
  `{ preview_id, reason }` (và Idempotency-Key), không chạy lại bộ lọc để
  bổ sung máy. Preview lưu tập ID cố định, thao tác, gói và người tạo; không
  dùng preview của người khác. Kiểm tra lại từng máy khi xác nhận, trả số
  thực tế/bỏ qua. Preview không tồn tại hoặc mất khi reload trả
  `preview_not_found`, yêu cầu xem trước lại; hết phiên không được xác nhận.
- Danh sách thiết bị và danh sách kho: mỗi dòng có thêm
  `entitlements_summary: [{ id, name, kind, status, used, quota, ends_at }]`
  (không gồm `revoked`/`expired`). Dữ liệu cũ thiếu trường → mảng rỗng.

Thao tác thu hồi máy đã kích hoạt: `POST /entitlements/{id}/revoke` với
`{ reason }`; từ chối nếu đã dùng hoặc đang giữ chỗ.

Mọi lệnh ghi quyền lợi, bao gồm hoàn thành phiếu, nhận header
`Idempotency-Key`. Client giữ nguyên khóa khi gửi lại cùng thao tác;
server lưu kết quả và fingerprint payload theo actor + thao tác + khóa.
Cùng payload trả lại kết quả cũ, không thêm event/audit; payload khác cùng
khóa trả `idempotency_conflict`. Kiểm tra quyền vẫn chạy trước khi trả kết
quả cũ. Kiểm tra, cập nhật lượt, event/audit và lưu kết quả phải nguyên tử.
Mock lưu trong bộ nhớ; backend thật cần lưu bền vững (thời hạn lưu cần chốt
khi tích hợp).

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


## 15. Quyết định sau phản biện — 28/10/2026

Mục này ghi các quyết định chủ sản phẩm đã duyệt, thay thế các đề xuất cũ
trái nội dung dưới đây. Chưa cho phép bắt đầu viết code sản phẩm trong lượt
cập nhật tài liệu này.

### 15.1. Phạm vi theo giai đoạn

- Giai đoạn A: quyền lợi dịch vụ, snapshot đầy đủ, số lượt tùy chỉnh,
  chống ghi nhận trùng, thao tác hàng loạt theo tập xem trước, thu hồi cấp nhầm.
  Chưa thêm capability/ma trận quyền; thao tác phụ thuộc quyền mới tạm hoãn,
  không triển khai endpoint ghi không có kiểm soát truy cập.
- Giai đoạn B: phiếu lắp đặt và trang riêng KTV dùng chủ yếu trên điện thoại.
  Người dùng đã chốt yêu cầu nghiệp vụ nhưng chưa muốn đi sâu luồng/UI.
  Không tự xây màn này trong giai đoạn A. Cần thiết kế chi tiết và duyệt
  phân quyền trước khi lập kế hoạch triển khai riêng.
- Không có màn KTV không đồng nghĩa cho ghi nhận lắp đặt bằng nút sử dụng
  thủ công. Các loại LD-STD, LD-PRO, TH-OLD phải qua phiếu xác nhận KTV;
  giai đoạn A chỉ cấp/hiển thị, chưa mở ghi nhận thủ công cho các loại này.

### 15.2. Lắp đặt và kích hoạt là hai mốc riêng

Máy đã có gói khi khách đến nhận. KGR tạo phiếu và phân công KTV bằng cách
chọn tên từ danh sách nhân sự (lưu ID, không chỉ chuỗi tên). KTV được phân
công xác nhận lắp thành công khi đủ checklist và ảnh. Không cần thêm bước
khách hàng/quản lý duyệt và không cần thao tác từ app.

Phiếu giữ chỗ một lượt; hoàn thành chuyển giữ chỗ thành đã dùng, không trừ
hai lần. Hủy phiếu trả giữ chỗ. Lắp đặt được phép trước kích hoạt/cloud:
quyền lợi lắp đặt chưa kích hoạt hiển thị “Chưa sử dụng” và có thể phục vụ
qua phiếu; hoàn thành không tự kích hoạt máy hoặc bắt đầu hạn gói khác.
Ngoại lệ này không mở quyền sử dụng sớm cho các gói bảo trì/chăm sóc.

Dù còn hiệu lực hay đã hết hạn, phiếu giữ chỗ hợp lệ trước hạn được hoàn
thành. Gói lắp đặt đã dùng phải hiện “Hết lượt” dù máy chưa kích hoạt.

Thông tin nghiệm thu tối thiểu: phiếu/máy/serial/gói, KTV được giao,
người xác nhận, thời điểm hoàn thành, kết quả checklist và ảnh. Checklist,
số ảnh, xác nhận thay, xử lý quay lại, tải ảnh khi mạng yếu và quy tắc đổi
KTV chưa chốt chi tiết; không coi các ví dụ đề xuất trong trao đổi là chính
sách đã duyệt.

### 15.3. Thu hồi, hoàn lượt và chống trùng

- Thu hồi trên máy đã kích hoạt chỉ khi chưa sử dụng và không có giữ chỗ;
  bắt buộc lý do, giữ lịch sử, không xóa. Không yêu cầu gói nguồn còn active.
- Chỉ hoàn sự kiện thực sự trừ lượt (`counts_against_quota = true`), loại
  consumed/shipment/manual, chưa hoàn và thuộc đúng quyền lợi; không để
  `used` âm. Hoàn lượt sau hạn không làm gói hiệu lực lại.
- Cùng một thao tác gửi lại không tạo event/audit hay trừ thêm lần nữa,
  kể cả khi còn nhiều lượt. Khóa chống trùng khác với kiểm tra quota.

### 15.4. Hàng loạt

- Xem trước cố định tập máy; xác nhận không thêm máy mới khớp bộ lọc.
- Kiểm tra lại điều kiện từng máy, kể cả kích hoạt, model, quyền lợi và
  trạng thái gói; trả số thực tế và lý do bỏ qua. Gói không còn hợp lệ để
  gắn thì không được gắn tiếp.
- Bộ chọn gỡ lấy gói từ quyền lợi đang tồn tại trong kho, bao gồm gói đã
  ngừng bán; không dùng chung bộ chọn chỉ lấy gói đủ điều kiện gắn mới.
- Gỡ khỏi máy chưa kích hoạt và thu hồi cấp nhầm sau kích hoạt cùng lưu
  `revoked`, nhưng UI phân biệt nhãn theo ngữ cảnh và giữ nguyên audit.

### 15.5. Các lựa chọn triển khai, chưa phải chính sách của KGR

- Chuẩn so sánh ngày hiệu lực, ranh giới hết hạn và phép cộng tháng phải
  nhất quán. Đề xuất giờ nghiệp vụ Asia/Ho_Chi_Minh; hết hạn khi
  `now >= ends_at`, cộng tháng chặn ngày cuối tháng theo dayjs. Đây là
  lựa chọn kỹ thuật cần thể hiện khi duyệt hợp đồng backend.
- Không tự giới hạn thời gian phiếu giữ chỗ sau hạn; chưa có quyết định
  nghiệp vụ về giới hạn này.
- Khi nhiều gói cùng phù hợp, cấp tất cả như mục 4.2; chưa tự suy diễn
  quy tắc loại trừ giữa các gói.

## 16. Bổ sung sau triển khai giai đoạn A — 28/10/2026

**[Đã triển khai]** — mục này ghi lại đúng những gì đã lên code trong phạm vi
giai đoạn A (xem ghi chú phạm vi đầu file), đối chiếu với bản nháp hợp đồng ở
mục 11. Đây không phải đặc tả cho Task 6/giai đoạn B; các endpoint, trường và
mã lỗi của Task 6 (ghi nhận gửi lõi/sử dụng tay/hoàn lượt/thu hồi) và phần
hàng loạt của Task 7 (`POST /devices/inventory/entitlements/bulk`) vẫn giữ
nguyên như bản nháp ở mục 11, **chưa có dòng code nào** — không được coi là đã
xong chỉ vì xuất hiện ở mục 11.

### 16.1. Endpoint thực tế đã có

- `POST /service-packages/{id}/auto-attach` — đúng như mục 11, có
  `Idempotency-Key` (`src/features/service-packages/mocks/servicePackageHandlers.ts`).
- `POST /devices/inventory/sync` — trả thêm `entitlements_attached: number`
  (nullish để tương thích dữ liệu cũ), đúng như mục 11
  (`src/features/devices/schemas/inventorySchemas.ts`).
- `GET /devices/{id}/entitlements` → `EntitlementDto[]`.
- `GET /entitlements/{id}/events` → trang `EntitlementEventDto[]`, mới nhất
  trước (`src/features/devices/mocks/entitlementHandlers.ts`). Hai endpoint
  này chỉ đọc — không có endpoint ghi nào khác cho quyền lợi trong giai đoạn A.
- `POST /devices/{id}/service-tickets` nhận thêm `entitlement_id` tùy chọn để
  giữ một lượt khi tạo phiếu thay lõi từ cảnh báo lõi (§6.3); không có luồng
  tạo phiếu nào khác tiêu thụ quyền lợi.

Các endpoint sau của mục 11 **chưa tồn tại** trong mã nguồn — thuộc giai đoạn
sau, chờ duyệt `service_entitlement.record`/`adjust`/`bulk_assign`:
`POST /entitlements/{id}/shipments`, `POST /entitlements/{id}/usages`,
`POST /entitlements/{id}/reversals`, `POST /entitlements/{id}/revoke`,
`POST /devices/{id}/entitlements` (thêm gói thủ công cho máy đã kích hoạt),
`GET /devices/{id}/entitlements/package-options`,
`GET /devices/inventory/entitlements/package-options`,
`POST /devices/inventory/entitlements/bulk`.

### 16.2. `entitlements_summary` có thêm hai trường so với bản nháp mục 11

Bản nháp mục 11 chỉ liệt kê
`{ id, name, kind, status, used, quota, ends_at }`. Mã nguồn đã triển khai
thêm hai trường để phục vụ tooltip ở tab Trong kho (§8.2):

```
entitlements_summary: [{ id, name, kind, status, used, quota, ends_at,
                          term_months, source_reference }]
```

(`src/features/devices/schemas/entitlementSchemas.ts`,
`entitlementSummaryDtoSchema`). Vẫn loại trừ `revoked`/`expired`; dữ liệu cũ
thiếu trường → mảng rỗng, như mục 11 đã định.

### 16.3. Mã lỗi thực tế đã dùng

Chỉ các mã lỗi sau tồn tại trong handler của giai đoạn A — client chỉ cần xử
lý i18n cho đúng danh sách này, không phải danh sách đầy đủ ở mục 11:

- `autoAttachBlocked`, `autoAttachFromPast`, `noChange`, `invalidTransition`
  (gói đã ngừng bán) — từ `POST /service-packages/{id}/auto-attach`.
- `idempotency_conflict` — dùng chung cho mọi lệnh ghi có
  `Idempotency-Key` ở giai đoạn A (bật/tắt tự gắn; sau này cũng dùng cho
  Task 6/7/8 qua `operationStore`).
- `entitlement_exhausted`, `entitlement_not_active`, `entitlement_not_eligible`
  — từ `POST /devices/{id}/service-tickets` khi `entitlement_id` không hợp lệ
  để giữ chỗ.

Mã lỗi `event_not_reversible`, `already_reversed`, `core_qr_not_found`,
`preview_not_found` thuộc các luồng hoàn lượt/thu hồi/quét QR lõi/xem trước
hàng loạt của Task 6 và phần hàng loạt Task 7 — **chưa có trong mã nguồn**,
không được client dựa vào cho tới khi các endpoint tương ứng được triển khai.
