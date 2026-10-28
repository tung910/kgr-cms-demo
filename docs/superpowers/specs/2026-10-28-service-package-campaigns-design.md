# Chiến dịch quảng cáo gói dịch vụ

Ngày: 28/10/2026 · Trạng thái: chờ duyệt · Liên quan:
`docs/SERVICE_PACKAGE_CATALOG.md`, `docs/CAMPAIGN_FEATURE_BUILD_PLAN.md`,
`docs/CMS_QnA_V1_SPEC.md` §7, `docs/CMS_QnA_V1_SPEC_7_SUPPLEMENT.md` §7.4,
`docs/superpowers/specs/2026-10-27-device-service-entitlements-design.md`,
`docs/superpowers/specs/2026-10-28-inventory-service-selection-design.md`.

Ký hiệu: **[Đã chốt]** là điều người dùng đã xác nhận trong buổi trao đổi;
**[Người viết]** là lựa chọn của người viết, người dùng cần kiểm tra khi đọc.

## 1. Mục đích và lý do

KGR có gói dịch vụ trong danh mục (vệ sinh máy `BT-CLN`, thay lõi `BT-COR`,
…) và muốn chạy chiến dịch quảng cáo để khách mua thêm gói sau khi đã có máy.
Hiện hai module không nối với nhau: chiến dịch chỉ có voucher, nút CTA cố định
(mua lõi, đặt KTV, gia hạn bảo hành, mở màn hình) và phân khúc khách; gói chỉ
vào máy qua nhân viên cấp lúc nhập lô.

Bản này là **demo portal + MSW** để chủ sản phẩm và marketing chốt cách nối
gói với chiến dịch trước khi làm backend và app thật **[Đã chốt]**.

**Khoảnh khắc thành công [Đã chốt]:** marketing tạo chiến dịch "Vệ sinh máy
giảm 20%" bằng cách chọn gói vệ sinh có sẵn trong danh mục, thấy ngay bản xem
trước điện thoại hiện đúng tên gói, giá gốc và giá sau giảm. Chiến dịch chạy
xong, trang chi tiết hiện lượt mua gói và doanh thu. Mở một máy đã mua thấy
quyền lợi "Vệ sinh máy" với nguồn "Mua qua chiến dịch X".

## 2. Mô hình liên kết [Đã chốt]

- **Danh mục gói** chỉ định nghĩa gói là gì (nội dung, giá niêm yết, thời hạn,
  số lượt). Gói được quảng cáo được tạo và phát hành như mọi gói khác.
- **Chiến dịch tham chiếu một gói đã phát hành, không sửa gói.** Khuyến mãi là
  voucher của chiến dịch áp lên gói, không tạo gói mới cho mỗi đợt giảm giá.
- Chiến dịch thay lõi dùng cùng cơ chế với gói `BT-COR`; trigger "lõi còn ≤ N
  ngày" và deeplink `core/replace` hiện có vẫn dùng được.

Luồng đầu–cuối:

1. Nhân viên phát hành gói trên danh mục.
2. Tạo chiến dịch, chọn gói được quảng cáo; CTA mở trang gói đó trên app.
3. (Không bắt buộc) voucher giảm giá áp cho gói.
4. Chọn đối tượng; có thể loại máy đã có gói.
5. Khách bấm push → app mở trang gói → mua/đặt lịch → KTV làm. **Thuộc app
   và backend, ngoài repo này.**
6. Mua xong máy được cấp quyền lợi nguồn "mua qua chiến dịch"; chiến dịch đếm
   lượt mua và doanh thu. Trong demo, bước này do MSW giả lập.

Bước 6 mở rộng phạm vi spec quyền lợi 27/10, vốn để ngoài "khách mua thêm gói
sau khi mua máy". Thiết kế này chỉ thêm nguồn quyền lợi mới và dữ liệu giả lập
để hiển thị; thanh toán và luồng mua thật vẫn ngoài phạm vi.

## 3. Mục tiêu, không phải mục tiêu, phản mục tiêu

**Mục tiêu [Đã chốt]**

1. Wizard chiến dịch có trường "Gói dịch vụ quảng cáo" (không bắt buộc), chỉ
   chọn được gói đang phát hành và đủ cấu hình. Nút CTA tự trỏ tới trang của
   gói trên app.
2. Voucher của chiến dịch áp cho gói đó; giá hiển thị lấy từ danh mục, không
   gõ tay.
3. Lọc đối tượng "máy chưa có gói X".
4. Số liệu chiến dịch có lượt mua gói và doanh thu (số liệu giả lập như số liệu
   chiến dịch hiện có).
5. MSW giả lập một số khách đã mua, sinh quyền lợi nguồn `campaign_purchase`
   gắn ID chiến dịch, chỉ để xem trên thiết bị.
6. Chặn cho chạy chiến dịch khi gói đã ngừng bán; nếu gói bị ngừng bán khi
   chiến dịch đang chạy thì hiện cảnh báo trên chiến dịch.

**Không phải mục tiêu [Đã chốt]:** thanh toán, màn mua/đặt lịch trên app, lịch
KTV, không đụng luồng nhập kho vừa làm xong. **[Người viết]** thêm: không sửa
gói từ chiến dịch; không làm engine quy đổi voucher (vẫn thuộc storefront §10,
câu hỏi mở 7.4.c); không quảng cáo nhiều gói trong một chiến dịch; không cấp
quyền lợi thật từ portal.

**Phản mục tiêu (chạy được vẫn là thất bại) [Người viết]**

- Giá trên push/xem trước khác giá trong danh mục.
- Chiến dịch được duyệt hoặc cho chạy với gói nháp/ngừng bán/thiếu cấu hình.
- Quyền lợi `campaign_purchase` xuất hiện mà không gắn được về một chiến dịch.
- Chiến dịch cũ không có gói bị đổi hành vi hoặc không còn đọc được.
- Lộ PII khách ngoài những gì màn chiến dịch/thiết bị đang hiển thị.

## 4. Hành vi chi tiết

### 4.1 Chọn gói trong wizard

- Trường **tuỳ chọn [Đã chốt]**: chiến dịch không liên quan dịch vụ bỏ trống
  và mọi thứ như hiện tại.
- Trường mới ở bước nội dung/ưu đãi: bộ chọn có tìm kiếm, hiện mã, tên, nhóm,
  giá (hoặc "Báo giá sau khảo sát"/"Miễn phí"), số lượt và thời hạn.
- Nguồn lựa chọn: chỉ gói `active` và đủ cấu hình, giống điều kiện cấp ở luồng
  nhập lô. Không lọc theo model.
- Chọn gói thì có thể thêm nút CTA loại mới "Mua gói dịch vụ"; nút này trỏ
  deeplink trang gói **của đúng máy** được nhắm tới. **[Người viết]** Vì quyền
  lợi gắn theo máy, deeplink dạng thiết bị như `core/replace`:
  `onekangaroo://service-packages/{packageId}?device={deviceId}` — hợp đồng đề
  xuất, app cần đăng ký màn này.
- Bỏ chọn gói thì gỡ nút CTA đó và ràng buộc voucher với gói.
- **[Người viết]** Một chiến dịch quảng cáo tối đa một gói.
- **[Người viết]** Bản demo không cho chọn gói kết hợp (TG-ALL/TG-SUB): gói
  cha không có quyền lợi riêng nên lọc "đã có gói" và quyền lợi giả lập không
  rõ nghĩa. Để đợt sau.
- Cả chiến dịch thủ công và chiến dịch tự động (trigger) đều được gắn gói.

### 4.2 Voucher áp cho gói

- Khi đã chọn gói, voucher của chiến dịch được ràng buộc vào gói đó (thay cho
  ô "áp dụng cho SKU/mã lỗi" tự do). Giá gốc đọc từ danh mục; giá sau giảm do
  UI tính để xem trước, không lưu như giá bán.
- **[Người viết]** Gói giá cố định: cho giảm % hoặc số tiền, số tiền không vượt
  giá gốc. Gói miễn phí/gộp giá: không cho gắn voucher giảm giá. Gói báo giá
  sau khảo sát: chỉ cho giảm %, xem trước hiện "Giảm X% trên báo giá".
- Gói thu tiền định kỳ (`recurring`/`subscription`): **[Người viết, người
  dùng giao đề xuất]** voucher chỉ giảm **kỳ thu tiền đầu tiên**; các kỳ gia
  hạn tính giá danh mục. "Giá gốc" là giá một kỳ (`price` cho
  `billing_period_months`), giới hạn giảm số tiền so với giá một kỳ. Xem trước
  ghi rõ kỳ, ví dụ "480.000đ năm đầu, sau đó 600.000đ/năm".
- Điểm thưởng (loyalty) vẫn dùng được như hiện có, không phụ thuộc gói.

### 4.3 Xem trước điện thoại

Hiện tên gói, giá gốc, giá sau giảm (nếu có) và nút "Mua gói dịch vụ", lấy từ
dữ liệu danh mục tại lúc xem.

### 4.4 Lọc đối tượng

- Điều kiện mới "Máy chưa có quyền lợi còn hiệu lực của gói đã chọn".
  **[Người viết]** Bật mặc định khi chọn gói, người tạo có thể tắt (ví dụ
  chiến dịch nhắc gia hạn). "Còn hiệu lực" theo quy tắc trạng thái quyền lợi
  hiện có (chưa hết hạn, chưa thu hồi; quyền lợi hết lượt vẫn tính là còn).
- **[Người viết]** So theo `package_id`: máy có quyền lợi cùng loại dịch vụ
  nhưng từ gói khác vẫn nằm trong đối tượng.
- Áp theo máy; dùng cách tính số khách xem trước và loại trừ (opt-out, test)
  hiện có.
- Chiến dịch tự động có gói: mua gói làm máy thoát chiến dịch, giống quy tắc
  "đã mua lõi → dừng nhắc" hiện có.

### 4.5 Ràng buộc trạng thái gói

- Gửi duyệt, duyệt, cho chạy và chạy lại sau tạm dừng đều bị từ chối nếu gói
  không còn `active` hoặc thiếu cấu hình, với mã lỗi rõ để người dùng xem lại.
- Gói bị ngừng bán khi chiến dịch đang chạy: danh sách và chi tiết chiến dịch
  hiện cảnh báo. **[Người viết]** Không tự đổi trạng thái chiến dịch; người có
  quyền `campaign.send` quyết định dừng. Trong lúc gói không bán, mock không
  sinh lượt gửi mới cho chiến dịch đó, để không đưa khách tới gói không mua được.
- Chiến dịch đã kết thúc vẫn đọc được gói cũ (kể cả đã ngừng bán) để xem lại.

### 4.6 Số liệu

Thêm vào số liệu chiến dịch: số lượt mua gói và doanh thu từ gói (giả lập,
cùng mô hình last-click và cửa sổ quy đổi hiện có). Chiến dịch không có gói
hiển thị như hiện tại.

**[Người viết]** Lượt mua gói là một phần của `orders`, doanh thu gói là một
phần của `revenue` (không cộng thêm, tránh đếm trùng), tính sau khi trừ voucher.
Với gói định kỳ chỉ tính kỳ đầu đã thu, không cộng doanh thu gia hạn dự kiến.
Gói báo giá sau khảo sát vẫn đếm lượt mua nhưng không có doanh thu, màn số liệu
ghi chú điều này. File CSV xuất số liệu thêm hai cột tương ứng.

### 4.7 Quyền lợi từ chiến dịch

- Thêm nguồn quyền lợi `campaign_purchase`, `reference` là ID chiến dịch.
  Chi tiết thiết bị hiện nhãn "Mua qua chiến dịch …"; người có `campaign.read`
  bấm sang được chiến dịch, người không có chỉ thấy nhãn.
- Snapshot, quota, thời hạn, giữ chỗ và lịch sử theo quy tắc quyền lợi hiện
  có. Thời hạn quyền lợi mua sau kích hoạt: **[Người viết]** tính từ ngày mua,
  độ dài theo `term_months` của gói như quyền lợi cấp lúc nhập lô. Gia hạn kỳ
  sau thuộc luồng thanh toán, ngoài phạm vi.
- MSW sinh sẵn một số quyền lợi loại này cho các chiến dịch seed đang chạy/đã
  kết thúc có gói, khớp với số lượt mua giả lập. Portal không có thao tác tạo
  quyền lợi loại này.

## 5. Dữ liệu, hợp đồng và quyền

Hợp đồng frontend/MSW đề xuất; backend thật chưa xác nhận.

- Chiến dịch thêm `promoted_package_id` (nullable). DTO đọc chiến dịch kèm bản
  tóm tắt gói tối thiểu (id, mã, tên, trạng thái, đủ cấu hình hay chưa, giá,
  cách tính giá) để màn chiến dịch không cần quyền đọc danh mục.
- Nút CTA thêm loại `buy_service_package`; schema bắt buộc chiến dịch có gói.
- Voucher: khi có gói, ràng buộc áp dụng là gói đó; giữ trường cũ cho chiến
  dịch cũ.
- Phân khúc thêm điều kiện loại máy đã có gói; mỗi máy trong dữ liệu đối
  tượng mock có thêm danh sách package ID còn hiệu lực.
  **[Người viết]** Dữ liệu đối tượng (`DEV-…`) và store quyền lợi/thiết bị
  (`KGR-…`) hiện là hai tập máy tách rời. Demo không hợp nhất chúng: danh sách
  gói trên máy đối tượng được seed cố định trong fixture đối tượng; quyền lợi
  `campaign_purchase` được seed trên máy `KGR-…` trong store quyền lợi chung.
  Hai bên nhất quán về số lượng theo từng chiến dịch, không về từng máy. Backend
  thật dùng một nguồn duy nhất. Không đổi mã máy hiện có để số liệu chiến dịch
  cũ giữ nguyên.
- Số liệu thêm `package_purchases`, `package_revenue`.
- Nguồn quyền lợi thêm `campaign_purchase`.
- Lựa chọn gói cho wizard: endpoint tối thiểu dưới `/campaigns`, chỉ trả gói
  active/đủ cấu hình. **[Người viết]** Gate bằng `campaign.write`, không yêu
  cầu `service_package.read`, theo cách luồng nhập lô dùng `device.inventory.sync`.
- Không thêm capability mới. Quyền tạo/duyệt/chạy chiến dịch và voucher giữ
  nguyên ma trận §7.
- Thay đổi chọn gói/voucher ghi vào audit chiến dịch hiện có (trước/sau).
- Mọi DTO parse Zod ở API boundary, mapper camelCase, nhãn VI/EN.

## 6. Tương thích

Chiến dịch cũ (`promoted_package_id` null) hoạt động và hiển thị như hiện tại,
kể cả số khách xem trước và số liệu giả lập.
Nút "Mua lõi" (mua lõi vật lý theo SKU) giữ nguyên và khác nút "Mua gói dịch
vụ". Không đổi luồng nhập lô, cảnh báo lõi, bảo hành điện tử, quyền lợi và
audit đã có.

## 7. Phần để builder quyết định

Vị trí trường trong các bước wizard, bố cục bộ chọn và cảnh báo, cách seed số
liệu giả lập, đặt tên endpoint/DTO cụ thể trong khuôn khổ mục 5, và tách nhỏ
commit. Builder theo `docs/CODING_CONVENTIONS.md` và `docs/SCREEN_WORKFLOW.md`.

## 8. Kiểm chứng

Chạy `pnpm lint`, `pnpm typecheck`, `pnpm format:check`, `pnpm build`; không
thêm framework test. Kiểm tra bằng MSW: tạo chiến dịch có gói giá cố định,
miễn phí, báo giá, định kỳ; voucher vượt giá bị chặn; xem trước đúng giá (gói
định kỳ ghi giá kỳ đầu và giá gia hạn); chiến dịch không chọn gói; lọc máy đã có
gói làm giảm số khách; gửi duyệt với gói ngừng bán bị từ chối; gói ngừng bán
khi đang chạy hiện cảnh báo; chiến dịch cũ không đổi; quyền lợi
`campaign_purchase` hiện trên thiết bị và link đúng chiến dịch; vai trò chỉ
đọc chiến dịch không thấy thao tác ghi; VI/EN.
