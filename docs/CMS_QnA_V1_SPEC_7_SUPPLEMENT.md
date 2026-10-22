# Phụ lục bổ sung — §7. Chiến dịch truyền thông

> Tài liệu này **bổ sung**, không thay thế, mục §7 trong `CMS_QnA_V1_SPEC.md`. Mục đích: lấp các khoảng trống nghiệp vụ/kỹ thuật của §7.1–7.6 để đủ điều kiện triển khai (hoặc demo nghiêm túc) mà không phải suy đoán các quy tắc nhạy cảm.
>
> **Phạm vi hiện tại của hệ thống**: portal chạy backend giả lập (MSW in-memory, reset khi reload), chưa có dịch vụ push thật, chưa có cron/scheduler. Vì vậy phần "gửi/hẹn giờ/đo lường" trong bản build demo là **mô phỏng ở tầng UI + mock**, nhưng mô hình dữ liệu và quy tắc dưới đây viết theo hướng để sau này nối backend thật không phải đập đi làm lại.

## Ký hiệu mức độ

| Ký hiệu | Ý nghĩa                                                                             | Cách xử lý                                            |
| ------- | ----------------------------------------------------------------------------------- | ----------------------------------------------------- |
| 🟢      | Mặc định đề xuất, không chạm phân quyền/PII/API ngoài                               | Mình chốt được, bạn chỉ cần phản đối nếu không đồng ý |
| 🔴      | Chạm phân quyền, PII (Nghị định 13), hoặc hợp đồng với app/e-commerce/push provider | **Bắt buộc bạn chốt**, không suy đoán                 |
| 🟡      | Tham số cấu hình được từ UI (config-over-hardcode)                                  | Chốt giá trị mặc định; phải sửa được trong UI         |

---

## 7.1. Tạo chiến dịch — bổ sung

### 7.1.a. Tách trường theo kênh

Push và in-app banner/popup là hai kênh khác nhau, không dùng chung một bộ trường.

| Trường                       | Push notification          | In-app banner/popup                                              |
| ---------------------------- | -------------------------- | ---------------------------------------------------------------- |
| Tiêu đề                      | ✅ bắt buộc, ≤ 65 ký tự 🟡 | ✅ (banner)                                                      |
| Nội dung                     | ✅ ≤ 240 ký tự 🟡          | ✅ (popup, hỗ trợ xuống dòng)                                    |
| Hình ảnh                     | tùy chọn                   | ✅ bắt buộc với banner                                           |
| Deeplink / CTA               | ✅                         | ✅                                                               |
| Vị trí hiển thị              | –                          | 🔴 (home, màn thiết bị, popup toàn màn…) cần app định nghĩa vùng |
| Cho phép tắt (dismissible)   | –                          | 🟢 mặc định có                                                   |
| Số lần hiển thị tối đa/khách | –                          | 🟡 mặc định 3 lần                                                |

### 7.1.b. Hình ảnh

- 🟢 Chấp nhận PNG/JPG/WebP, ≤ 2 MB; banner tỷ lệ khuyến nghị 2:1, push icon vuông.
- 🔴 **Nơi lưu ảnh**: upload lên CDN của hệ thống hay nhập URL ngoài? (hợp đồng lưu trữ + bảo mật). Demo: lưu data URL/mock.

### 7.1.c. Deeplink

- 🔴 **Hợp đồng deeplink với app OneKangaroo**: scheme hợp lệ (vd `onekangaroo://`), danh sách màn đích được phép, cơ chế validate. CMS chỉ cho chọn trong danh sách màn app đã đăng ký, không nhập tự do.
- 🟢 Fallback khi app chưa hỗ trợ màn đích: mở trang web mặc định / bỏ qua CTA.

### 7.1.d. Nội dung đa ngôn ngữ

- 🔴 App phục vụ vi/en: mỗi chiến dịch soạn nội dung **theo từng ngôn ngữ** hay chỉ 1 ngôn ngữ chọn theo locale của khách? Đề xuất: soạn tối thiểu tiếng Việt, cho phép thêm bản tiếng Anh tùy chọn.

### 7.1.e. Lịch gửi

- 🟡 Múi giờ chuẩn: `Asia/Ho_Chi_Minh`, hiển thị rõ trên UI.
- 🟡 **Khung giờ im lặng (quiet hours)**: mặc định không gửi push 21:00–08:00; tin rơi vào khung này dời sang 08:00 hôm sau.
- 🟢 Nếu giờ hẹn đã trôi qua khi chiến dịch vẫn ở trạng thái Nháp/Chờ duyệt: khi được duyệt sẽ cảnh báo "giờ hẹn đã qua", yêu cầu đặt lại lịch hoặc chuyển sang gửi ngay.

---

## 7.2. Phân khúc đối tượng — bổ sung

### 7.2.a. Mô hình điều kiện

- 🟢 Mỗi điều kiện = `{ field, operator, value }`. Các điều kiện nối với nhau bằng **AND** ở bản v1 (không hỗ trợ nhóm OR lồng nhau để giữ đơn giản; ghi nhận OR là backlog).
- 🟢 Toán tử theo field:

| Field               | Toán tử                                 | Ghi chú                                                                         |
| ------------------- | --------------------------------------- | ------------------------------------------------------------------------------- |
| Khu vực             | thuộc danh sách                         | lấy từ `SystemConfig.catalogs.region`                                           |
| Model               | thuộc danh sách                         | từ catalog model                                                                |
| FW                  | thuộc danh sách / `≥`                   |                                                                                 |
| Số ngày lõi còn lại | `≤` / khoảng                            | đơn vị ngày                                                                     |
| Trạng thái bảo hành | thuộc {active, expiring, expired, none} |                                                                                 |
| Điểm loyalty        | `≥` / khoảng                            | 🔴 nguồn dữ liệu (xem 7.4.d)                                                    |
| TDS khu vực         | `≥`                                     | ngưỡng mặc định 55 ppm 🟡                                                       |
| Thời gian tham gia  | `≥` N tháng                             | 🔴 mốc tính: ngày kích hoạt thiết bị đầu tiên (đề xuất) hay ngày tạo tài khoản? |

### 7.2.b. Đơn vị đối tượng & chống trùng

- 🔴 "Số KH" đếm theo **khách hàng duy nhất** hay theo thiết bị? Đề xuất: đếm theo khách hàng, một khách nhiều thiết bị chỉ tính 1 (dedup theo customerId).

### 7.2.c. Loại trừ / suppression

- 🔴 **Danh sách loại trừ bắt buộc**: khách đã opt-out marketing, do-not-contact, và khách vừa nhận tin trong cửa sổ trần tần suất (xem 7.5.b). Những khách này không được tính vào tập gửi kể cả khi thỏa điều kiện.

### 7.2.d. Preview số KH

- 🟢 Preview là **snapshot tại thời điểm xem**, kèm nhãn thời gian. Bắt buộc bấm preview trước khi lưu (giữ nguyên ràng buộc §7.2 gốc).
- 🟢 Đánh giá lại tập đối tượng **một lần nữa tại thời điểm gửi** (không dùng snapshot cũ để gửi), vì tập có thể trôi.
- 🟡 **Trần an toàn**: cảnh báo khi tập > 50.000 khách, yêu cầu xác nhận thêm.

### 7.2.e. Danh sách chiều phân khúc mở rộng

§7.2 gốc mới có 8 điều kiện (khu vực, model, FW, số ngày lõi còn lại, trạng thái bảo hành, điểm loyalty, TDS khu vực, thời gian tham gia). Bổ sung các chiều dưới đây. Ký hiệu nguồn dữ liệu: **✅** đã có dữ liệu trong hệ thống để lọc; **🆕** cần tạo dữ liệu mock mới. Cột **Phạm vi**: `Demo` = làm trong bản build này; `Backlog` = ghi nhận, chưa làm.

**Thiết bị & vận hành**

| Chiều                                        | Nguồn | Phạm vi | Ghi chú                     |
| -------------------------------------------- | ----- | ------- | --------------------------- |
| Trạng thái kết nối (online/cảnh báo/offline) | ✅    | Demo    | nhắm máy offline lâu        |
| Thời gian offline (vd > 7 ngày)              | ✅    | Demo    |                             |
| Dòng sản phẩm / ngành                        | ✅    | Demo    | bắt buộc khi multi-industry |
| Mã lỗi ER đang mở                            | ✅    | Demo    | vd `ER00051`                |
| FW module vs mainboard (tách riêng)          | ✅    | Demo    | thay cho "FW" chung         |
| Số thiết bị sở hữu                           | 🆕    | Demo    | khách nhiều máy / VIP       |
| Trạng thái kích hoạt / chủ sở hữu            | ✅    | Backlog | status no-owner             |

**Lõi & vật tư tiêu hao**

| Chiều                                | Nguồn | Phạm vi | Ghi chú               |
| ------------------------------------ | ----- | ------- | --------------------- |
| % tuổi thọ lõi còn lại               | ✅    | Demo    | bổ sung cho "số ngày" |
| Lõi chính hãng vs nghi ngờ giả       | 🆕    | Demo    | anti-counterfeit      |
| Loại lõi / SKU đang dùng             | 🆕    | Backlog | upsell đúng SKU       |
| Số lần thay lõi / ngày thay gần nhất | 🆕    | Backlog |                       |

**Bảo hành & dịch vụ**

| Chiều                               | Nguồn | Phạm vi | Ghi chú                           |
| ----------------------------------- | ----- | ------- | --------------------------------- |
| Trung tâm dịch vụ phụ trách         | ✅    | Backlog | chiến dịch theo vùng TT DV        |
| Đã từng có ticket / số lần sửa chữa | 🆕    | Backlog |                                   |
| Điểm hài lòng khảo sát              | 🆕    | Backlog |                                   |
| Có lịch hẹn dịch vụ sắp tới         | 🆕    | Backlog | dùng để loại trừ tránh nhắc trùng |

**Khách hàng & tài khoản**

| Chiều                                | Nguồn | Phạm vi | Ghi chú                                     |
| ------------------------------------ | ----- | ------- | ------------------------------------------- |
| Loại khách (cá nhân/DN/đại lý)       | ✅    | Demo    | account levels                              |
| Trạng thái tài khoản (active/locked) | ✅    | Demo    | loại trừ tài khoản khoá                     |
| Trạng thái opt-in + ngôn ngữ ưa dùng | 🆕    | Demo    | vừa là bộ lọc vừa ràng buộc pháp lý (7.7.a) |
| Hạng loyalty / tier                  | 🆕    | Backlog | bên cạnh số điểm                            |
| Giá trị / lịch sử mua hàng (RFM)     | 🆕    | Backlog | phân khúc giá trị                           |
| Đã mua lõi/phụ kiện qua e-commerce   | 🆕    | Backlog |                                             |
| Nền tảng + phiên bản app             | 🆕    | Backlog | deeplink phụ thuộc version                  |

**Địa lý (chi tiết hơn "khu vực")**

| Chiều                            | Nguồn | Phạm vi | Ghi chú                    |
| -------------------------------- | ----- | ------- | -------------------------- |
| Vùng chất lượng nước / water map | ✅    | Demo    | chi tiết hơn "TDS khu vực" |
| Tỉnh/thành, quận/huyện           | 🆕    | Backlog | "khu vực" hiện đang thô    |

**Hành vi & tương tác**

| Chiều                                  | Nguồn | Phạm vi | Ghi chú                       |
| -------------------------------------- | ----- | ------- | ----------------------------- |
| Đã mở/click chiến dịch trước           | 🆕    | Backlog | re-target / loại trừ          |
| Mức độ hoạt động app (active/ngủ đông) | 🆕    | Backlog |                               |
| Đã quét QR kích hoạt lõi mới chưa      | 🆕    | Backlog | gắn với metric chuyển đổi 7.6 |

**Vòng đời khách**

| Chiều                                                    | Nguồn | Phạm vi | Ghi chú             |
| -------------------------------------------------------- | ----- | ------- | ------------------- |
| Giai đoạn vòng đời (mới/trưởng thành/nguy cơ rời/đã rời) | 🆕    | Backlog | chiến dịch giữ chân |

> **Ưu tiên demo**: các chiều ✅ có sẵn dữ liệu + vài chiều 🆕 giá trị cao (số thiết bị sở hữu, lõi chính hãng/giả, opt-in/ngôn ngữ) được gắn `Demo`; phần còn lại gắn `Backlog`. Mọi chiều đều theo mô hình `{ field, operator, value }` nối **AND** như mục 7.2.a.

---

## 7.3. Chiến dịch tự động (trigger) — bổ sung

### 7.3.a. Tham số trigger

- 🟡 "Lõi còn ≤ N ngày": N mặc định **15 ngày**, cấu hình được, cho phép đặt theo model/SKU.
- 🟡 "Bảo hành sắp hết": giữ **30 ngày** theo bảng tham số gốc.
- 🟡 "TDS vùng cao": ngưỡng **55 ppm** theo tham số gốc, cấu hình theo khu vực.

### 7.3.b. Tần suất & chống làm phiền

- 🟡 Chu kỳ đánh giá trigger: 1 lần/ngày (demo: đánh giá khi mở màn).
- 🟡 **Cooldown**: cùng một loại nhắc không gửi lại cho một khách trong 30 ngày.
- 🟢 **Điều kiện dừng trigger**: khách đã thay lõi / đã có lịch hẹn / đã gia hạn bảo hành / đã opt-out → không gửi.

### 7.3.c. Phê duyệt trigger

- 🔴 Trigger chạy 24/7 nhưng **mẫu nội dung + ưu đãi đính kèm có cần duyệt một lần không?** Đề xuất: mẫu trigger vẫn đi qua luồng duyệt §7.5 một lần trước khi "Đang chạy"; sau đó tự phát theo điều kiện. Cần bạn xác nhận vì ảnh hưởng quyền.

---

## 7.4. Ưu đãi (voucher / điểm) — bổ sung

### 7.4.a. Mô hình voucher

- 🟢 Trường tối thiểu: `code` (hoặc quy tắc sinh mã), `type` (percent | fixed | free_ship | points), `value`, `minOrder`, `applicableSkus[]`, `validFrom`, `validTo`, `usageLimitTotal`, `usageLimitPerCustomer`, `stackable` (mặc định false).
- 🔴 **Mã dùng chung hay sinh riêng từng khách?** Ảnh hưởng chống gian lận và hợp đồng với e-commerce §10.

### 7.4.b. Giới hạn số lượt

- 🟢 Tách rõ **tổng số lượt toàn chiến dịch** và **số lượt mỗi khách** (mặc định 1 lượt/khách).

### 7.4.c. Nơi quy đổi

- 🔴 Voucher áp dụng/khấu trừ ở **storefront §10** — cần hợp đồng API: ai là nguồn chân lý về trạng thái đã dùng, cơ chế đồng bộ.

### 7.4.d. Điểm loyalty

- 🔴 **Loyalty engine hiện chưa tồn tại** trong hệ thống. Cần chốt: nguồn số dư điểm, cơ chế cộng/trừ, nguồn chân lý. Demo: dùng dataset điểm giả lập.

### 7.4.e. Ngân sách & vòng đời

- 🟡 Trần ngân sách/chi phí ưu đãi mỗi chiến dịch (cảnh báo khi vượt).
- 🟢 Sửa/huỷ voucher đã phát hành: giữ ràng buộc §7.4 gốc — chỉ Admin trở lên, **bắt buộc lý do + audit** (xem 7.7).

---

## 7.5. Phê duyệt & kiểm soát — bổ sung

### 7.5.a. Máy trạng thái đầy đủ

Bổ sung các nhánh còn thiếu quanh luồng gốc `Nháp → Chờ duyệt → Đã duyệt → Đang chạy → Kết thúc`:

| Chuyển trạng thái                        | Ai                               | Ghi chú                                                                      |
| ---------------------------------------- | -------------------------------- | ---------------------------------------------------------------------------- |
| Nháp → Chờ duyệt                         | KD (`campaign.write`)            | "Gửi duyệt"                                                                  |
| Chờ duyệt → **Trả về nháp (từ chối)**    | Admin/Super (`campaign.approve`) | 🟢 **nhánh mới**, bắt buộc kèm lý do                                         |
| Chờ duyệt → Đã duyệt                     | Admin/Super (`campaign.approve`) | người duyệt ≠ người tạo                                                      |
| Đã duyệt → Đang chạy                     | 🔴 `campaign.send` (xem 7.7)     | gửi ngay, hoặc tự động khi tới giờ hẹn                                       |
| Đang chạy → **Tạm dừng / Dừng khẩn cấp** | Admin/Super                      | 🟢 **nhánh mới**, kèm lý do; Admin có quyền dừng gấp theo §7.1 gốc           |
| Tạm dừng → Đang chạy                     | Admin/Super                      |                                                                              |
| Đang chạy → Kết thúc                     | hệ thống                         | khi hết `endsAt` hoặc gửi xong                                               |
| Đã duyệt/Đang chạy → **Sửa nội dung**    | KD                               | 🔴 sửa sau duyệt có **buộc duyệt lại** không? Đề xuất: có, quay về Chờ duyệt |

### 7.5.b. Trần tần suất gửi mỗi khách

- 🟡 Mặc định tối đa **3 tin/khách/7 ngày**, tính **gộp mọi chiến dịch và kênh**.
- 🔴 Khi nhiều chiến dịch cùng nhắm một khách và chạm trần: **ưu tiên theo thứ tự nào?** Đề xuất: theo độ ưu tiên đặt trên chiến dịch, rồi tới thời gian tạo.

### 7.5.c. Gửi thử (test send)

- 🟢 Nhóm test = danh sách tối đa 10 khách/thiết bị nội bộ do người tạo chọn. Tin gửi thử **không tính vào metric §7.6** và **không tiêu voucher**.

### 7.5.d. Thông báo & SLA duyệt

- 🟢 Khi có chiến dịch chuyển sang Chờ duyệt, người có `campaign.approve` nhận thông báo (dùng chuông thông báo sẵn có).
- 🟡 SLA duyệt mục tiêu: hiển thị thời gian chờ, không auto-approve.

---

## 7.6. Đo lường hiệu quả — bổ sung

### 7.6.a. Các chỉ số & mẫu số

- 🟢 Chỉ số: `sent`, `delivered` (gửi thành công), `failed` (kèm lý do lỗi), `opened`, `clicked`, `converted`, `revenue`.
- 🟢 Tỷ lệ tính rõ mẫu số: delivery rate = delivered/sent; open rate = opened/delivered; click rate = clicked/opened.

### 7.6.b. Attribution

- 🔴 **Cửa sổ quy đổi**: bao nhiêu ngày sau click thì tính là chuyển đổi? Đề xuất mặc định **7 ngày**, mô hình **last-click**.
- 🔴 **"Doanh thu ghi nhận"** lấy từ đâu (đơn hàng e-commerce §10), tiền tệ (VND), gross hay net.

### 7.6.c. Chuyển đổi

- 🟢 Định nghĩa "chuyển đổi" = đặt lịch dịch vụ **hoặc** kích hoạt QR lõi mới (theo §7.6 gốc). Đo theo từng loại.
- 🟡 Metric có thể xem theo segment / theo voucher. Xuất CSV theo `campaign.export`.

---

## 7.7. Ràng buộc xuyên suốt (áp cho toàn §7)

Đây là nhóm quan trọng nhất — phần lớn là rule bắt buộc của dự án (CLAUDE.md/AGENTS.md), **không được suy đoán**.

### 7.7.a. Consent / opt-out marketing — 🔴

- Mỗi khách có trạng thái đồng ý nhận truyền thông; khách đã opt-out bị loại khỏi mọi tập gửi (kể cả trigger). Cần cơ chế hủy đăng ký. Yêu cầu pháp lý — không có thì không được gửi.

### 7.7.b. Mask PII theo vai trò — 🔴

- Màn preview đối tượng **và file export** phải mask PII (tên, SĐT, email) theo vai trò, nhất quán UI–export–API (Nghị định 13/2023/NĐ-CP). Export danh sách đối tượng phải tuân cùng quy tắc mask với các màn khác.

### 7.7.c. Audit bất biến — 🟢 (bắt buộc theo rule dự án)

- Ghi audit cho **mọi** hành động đổi trạng thái và thao tác nhạy cảm: tạo, gửi duyệt, duyệt, từ chối, cho chạy, tạm dừng, dừng, sửa, gắn/huỷ voucher. Mỗi bản ghi: actor, thời điểm, đối tượng, before/after, lý do; không sửa/xoá từ UI.
- Thêm module `campaigns` vào `AUDIT_MODULES` (`src/features/system/constants/auditModules.ts`) và locale `audit.modules.campaigns`.

### 7.7.d. Config-over-hardcode — 🟡 (bắt buộc theo rule dự án)

- Các tham số: N ngày lõi, 30 ngày bảo hành, 55 ppm TDS, quiet hours, trần tần suất, cửa sổ attribution, cooldown trigger — **phải sửa được từ UI** và hiệu lực trong vài phút, không hard-code.

### 7.7.e. Đa ngành / multi-tenant — 🔴

- Chiến dịch thuộc ngành/tenant nào; phân khúc và đo lường tách theo tenant. Cần chốt mức độ áp dụng trong bản build này.

### 7.7.f. Nhà cung cấp gửi tin & độ tin cậy — 🔴

- Kênh gửi thật (FCM/APNs/Zalo OA/SMS?), xử lý thất bại + lý do lỗi, retry, **idempotency chống gửi trùng**. (Demo: mô phỏng, nhưng mô hình dữ liệu phải có `delivered`/`failed`/`failureReason`.)

### 7.7.g. Bổ sung capability — 🔴

Hệ thống đã seed sẵn `campaign.read / write / voucher.create / voucher.update / approve / export`. Đề xuất **tách thêm** để đúng §7.5 (phân biệt "duyệt" và "cho chạy") và §7.3:

| Capability đề xuất                        | Lý do                                                              | Vai trò đề xuất |
| ----------------------------------------- | ------------------------------------------------------------------ | --------------- |
| `campaign.send` (hoặc `campaign.control`) | §7.5 phân biệt "cho chạy/dừng" với "duyệt"; hiện gộp vào `approve` | Super, Admin    |
| `campaign.frequency.config`               | cấu hình trần tần suất gửi (ảnh hưởng chi phí)                     | Super, Admin    |

> So sánh: OTA đã có `ota.campaign.control` tách khỏi create/update — campaign marketing nên theo cùng mẫu.

---

## Bảng tham số mặc định mới (đề xuất)

| Tham số               | Mặc định đề xuất              | Cấu hình UI | Ghi chú                 |
| --------------------- | ----------------------------- | ----------- | ----------------------- |
| Múi giờ               | Asia/Ho_Chi_Minh              | –           |                         |
| Quiet hours push      | 21:00–08:00                   | 🟡          | dời tin sang 08:00      |
| Trần tần suất/khách   | 3 tin / 7 ngày (gộp mọi kênh) | 🟡          |                         |
| N ngày lõi (trigger)  | 15 ngày                       | 🟡          | đặt được theo model/SKU |
| Ngưỡng bảo hành       | 30 ngày                       | 🟡          | theo tham số gốc        |
| Ngưỡng TDS vùng       | 55 ppm                        | 🟡          | theo tham số gốc        |
| Cooldown trigger      | 30 ngày                       | 🟡          |                         |
| Cửa sổ attribution    | 7 ngày, last-click            | 🔴          |                         |
| Trần an toàn audience | cảnh báo > 50.000 KH          | 🟡          |                         |
| Nhóm test tối đa      | 10 KH                         | 🟢          |                         |
| Giới hạn ký tự push   | tiêu đề 65 / nội dung 240     | 🟡          |                         |
| Ảnh                   | ≤ 2 MB, PNG/JPG/WebP          | 🟢          |                         |

---

## Danh sách quyết định cần bạn chốt (🔴)

1. Lưu ảnh: upload CDN hệ thống hay URL ngoài? (7.1.b)
2. Hợp đồng deeplink với app: danh sách màn đích + scheme. (7.1.c)
3. Nội dung đa ngôn ngữ: 1 ngôn ngữ hay theo locale khách? (7.1.d)
4. Mốc tính "thời gian tham gia": kích hoạt thiết bị đầu hay tạo tài khoản? (7.2.a)
5. Đếm "số KH" theo khách duy nhất hay theo thiết bị? (7.2.b)
6. Danh sách loại trừ/opt-out: xác nhận bắt buộc. (7.2.c, 7.7.a)
7. Trigger template có đi qua duyệt một lần không? (7.3.c)
8. Voucher: mã dùng chung hay sinh riêng từng khách? (7.4.a)
9. Nguồn chân lý voucher/trạng thái đã dùng (e-commerce §10). (7.4.c)
10. Nguồn dữ liệu điểm loyalty. (7.4.d)
11. Sửa sau duyệt có buộc duyệt lại không? (7.5.a)
12. Ưu tiên khi nhiều chiến dịch chạm trần tần suất một khách. (7.5.b)
13. Cửa sổ & mô hình attribution; nguồn doanh thu. (7.6.b)
14. Mask PII trên preview + export — xác nhận quy tắc theo vai trò. (7.7.b)
15. Phạm vi multi-tenant trong bản build này. (7.7.e)
16. Kênh gửi thật + xử lý thất bại/idempotency. (7.7.f)
17. Bổ sung capability `campaign.send` và `campaign.frequency.config`? (7.7.g)

> Các mục 🟢/🟡 còn lại mình sẽ áp mặc định như trên trừ khi bạn phản hồi khác; các mục 🔴 ở trên cần bạn chốt (hoặc đồng ý ghi nhận là "assumption") trước khi build.

---

## Quyết định đã chốt (2026-10-22)

17 quyết định 🔴 đã được chốt như dưới đây. Những mục nối tới hệ thống thật (app, e-commerce §10, loyalty engine, push provider) được **ghi nhận là assumption** cho bản build demo — mô hình dữ liệu viết sẵn để sau nối backend thật không phải làm lại.

| #   | Quyết định                 | Chốt                                                                                                                       |
| --- | -------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| 1   | Lưu ảnh                    | Demo: upload mock (data URL). Prod: upload CDN hệ thống, không nhận URL ngoài.                                             |
| 2   | Deeplink                   | Chỉ chọn trong danh sách màn app đã đăng ký (enum cấu hình), scheme `onekangaroo://`; demo dùng danh sách mock cố định.    |
| 3   | Đa ngôn ngữ                | Bắt buộc tiếng Việt, tiếng Anh tùy chọn; app hiển thị theo locale khách, fallback vi.                                      |
| 4   | Mốc "thời gian tham gia"   | Tính từ ngày kích hoạt thiết bị đầu tiên.                                                                                  |
| 5   | Đếm "số KH"                | Theo khách duy nhất (dedup theo customerId).                                                                               |
| 6   | Opt-out                    | Bắt buộc: trạng thái opt-in trên khách + bộ lọc loại trừ cứng, áp cả trigger.                                              |
| 7   | Trigger template duyệt     | Mẫu trigger đi qua duyệt §7.5 một lần trước khi Đang chạy, sau đó tự phát.                                                 |
| 8   | Voucher mã                 | Hỗ trợ cả hai; mặc định sinh mã riêng từng khách cho ưu đãi cá nhân hoá, mã chung cho khuyến mãi đại trà.                  |
| 9   | Nguồn chân lý voucher      | E-commerce/storefront §10 là nguồn chân lý trạng thái đã dùng; CMS phát hành + đồng bộ (demo: mock) — **assumption**.      |
| 10  | Dữ liệu loyalty            | Demo: dataset điểm mock trên khách; prod chờ loyalty engine — **assumption**.                                              |
| 11  | Sửa sau duyệt              | Buộc duyệt lại — quay về Chờ duyệt.                                                                                        |
| 12  | Ưu tiên chạm trần tần suất | Theo priority đặt trên chiến dịch, rồi thời gian tạo.                                                                      |
| 13  | Attribution + doanh thu    | 7 ngày, last-click; doanh thu từ đơn e-commerce §10 (VND, net); demo fabricate — **assumption**.                           |
| 14  | Mask PII preview + export  | Áp cùng quy tắc mask theo vai trò như các màn hiện có, nhất quán UI–export–API.                                            |
| 15  | Multi-tenant               | Mỗi chiến dịch gắn 1 tenant/ngành, hiển thị 1 tenant mặc định; chuyển tenant = backlog.                                    |
| 16  | Kênh gửi + thất bại        | Demo mô phỏng; dữ liệu có `delivered/failed/failureReason` + `sendId` idempotent; provider thật chốt sau — **assumption**. |
| 17  | Bổ sung capability         | Thêm `campaign.send` và `campaign.frequency.config` (Super, Admin).                                                        |

> Kế hoạch triển khai chi tiết: xem `docs/CAMPAIGN_FEATURE_BUILD_PLAN.md`.
