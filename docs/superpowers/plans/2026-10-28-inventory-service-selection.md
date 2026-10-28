# Inventory Service Selection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Nhập lô serial, chọn gói chung, chỉnh từng máy và xác nhận cấp quyền lợi; bỏ giới hạn model và tự gắn.

**Architecture:** Mở rộng slice devices, giữ danh mục tại service-packages. Preview không ghi kho; confirm dùng tập máy cố định, package ID theo máy và khóa chống gửi trùng. MSW dùng store chung, không thay thế backend thật.

**Tech Stack:** React 19, TypeScript, Zod 4, Ant Design 6, TanStack Query/Router, MSW 2, pnpm.

**Spec:** `docs/superpowers/specs/2026-10-28-inventory-service-selection-design.md` (đã được người dùng duyệt).

## Global Constraints

- Node.js 24+, pnpm 10+; không thêm dependency/framework hoặc test files khi chưa có kế hoạch riêng được duyệt.
- Thực hiện trong `.worktrees/service-catalog`, nhánh `codex/service-catalog`; bảo toàn thay đổi người khác, kiểm tra status trước mỗi task.
- Mọi DTO parse Zod, mapper sang camelCase; query factory; capability thay role; VI/EN cùng thay đổi.
- Dùng `device.inventory.sync` cho preview/confirm/options, không thêm quyền hoặc yêu cầu `service_package.write`.
- Không cấp gói nháp/ngừng bán/thiếu cấu hình; không lọc model hay trạng thái giá.
- Gói có giá được cấp ngay, không ghi nhận thanh toán; bundle tách thành phần và hợp nhất package ID trùng.
- Không sửa quyền lợi cũ, bảo hành điện tử, giữ chỗ cảnh báo lõi hoặc màn KTV.
- Bốn check bắt buộc và kiểm tra MSW trước khi kết luận hoàn thành; không push nếu chưa được yêu cầu.

## Review Focus

1. Quay lại sửa gói chung không ghi đè máy chỉnh riêng (Task 4).
2. Gói hoặc thành phần bundle ngừng bán sau preview không được cấp âm thầm (Task 3).
3. Timeout sau confirm rồi retry không tạo thêm máy/quyền lợi/audit (Task 3/4).
4. Vai trò nhập kho không có quyền đọc/sửa danh mục vẫn đọc được options tối thiểu (Task 2/3).
5. Trường model/auto_attach cũ không tiếp tục chặn hoặc tự cấp qua đường đồng bộ khác (Task 1/3).

## Quyết định triển khai của người viết

- Bản đầu nhận CSV UTF-8, header `serial,model`; hỗ trợ BOM, CRLF, ô quoted với dấu phẩy/dấu ngoặc kép escape. Không nhận XLSX; cung cấp CSV mẫu. Giới hạn kỹ thuật: 5 MiB, 10.000 dòng; nhãn UI nói rõ. Đây không phải hạn mức nghiệp vụ backend.
- `model` là mã model; backend tra dữ liệu chuẩn để tạo bản ghi kho, không bắt client nhập firmware/QC/ngày sản xuất giả. Fixture MSW dùng dữ liệu model/inventory có sẵn.
- Giữ upload và nguồn đồng bộ tự động, cả hai đi qua preview/confirm. Không thêm menu/route: wizard trong modal rộng từ nút kho hiện có.
- Mock xử lý serial đã tồn tại bằng kết quả `skipped` với mã `serial_exists`, không thay quyền lợi; đây là hành vi minh họa, backend thật quyết định.
- Mock confirm kiểm tra hết request trước khi ghi; lỗi hợp đồng/gói khiến cả request bị từ chối. Các serial tồn tại có kết quả skip. Response hỗ trợ từng dòng; frontend không suy diễn tính nguyên tử backend thật.

### Task 1: Danh mục không phụ thuộc model hoặc tự gắn

**Files:** sửa `src/features/service-packages/{schemas/servicePackageSchemas.ts,schemas/servicePackageConfiguration.ts,api/servicePackageApi.ts,api/servicePackageMapper.ts,components/ServicePackageForm.tsx,components/ServicePackagePreview.tsx,components/ServicePackageTable.tsx,pages/ServicePackageListPage.tsx,mocks/servicePackageHandlers.ts,locales/en.json,locales/vi.json}`; bỏ component auto-attach và API mutation chỉ khi hết caller. Sửa `utils/entitlementRules.ts` chỉ bỏ rule tự gắn; giữ hàm quota đang dùng.

**Interfaces:** giữ tên create/list/status API; tạo mới không yêu cầu model hay auto-attach; DTO đọc chấp nhận dữ liệu cũ. Không chuyển details thành null chỉ vì thiếu model.

- [ ] Dùng `rg` xác định toàn bộ caller model/autoAttach; lưu đối chiếu bản ghi cũ đầy đủ/thiếu cấu hình.
- [ ] Bỏ field/picker/count model và công tắc tự gắn khỏi form, preview, bảng, drawer và validation tạo/phát hành. Giữ quota tùy chỉnh. Dữ liệu request mới bỏ trường cũ; handler tạo chuẩn hóa legacy nếu DTO đọc còn cần.
- [ ] Endpoint auto-attach cũ không được bật lại cấu hình; bỏ client call và trả lỗi rõ nếu còn request cũ. Legacy read vẫn giữ lịch sử.
- [ ] Kiểm tra MSW tạo/phát hành gói không model, đọc gói cũ và ngừng bán; ghi kết quả. Chạy typecheck và lint.
- [ ] Commit `refactor(service-packages): remove model scope and auto-attach controls`.

### Task 2: Hợp đồng import và bộ đọc CSV

**Files:** tạo `src/features/devices/schemas/inventoryImportSchemas.ts`, `api/inventoryImportApi.ts`, `api/inventoryImportMapper.ts`, `utils/parseInventoryCsv.ts`; mở rộng `queries/deviceQueries.ts`.

**Interfaces:** `parseInventoryCsv(text: string): InventoryImportRow[]`, row `{serial:string,model:string}`; lỗi gồm dòng/cột. API `previewInventoryImport(input: InventoryImportSource): Promise<InventoryImportPreview>`, `getInventoryImportPackageOptions(): Promise<InventoryImportPackageOption[]>`, `confirmInventoryImport(input: InventoryImportConfirmInput, operationKey: string): Promise<InventoryImportResult>`.

**Wire contract đề xuất:** POST `/devices/inventory/import/preview` nhận `{source:'csv',rows:[{serial,model}]}` hoặc `{source:'warehouse'}`; trả `{preview_id,items:[{row_id,serial,model}]}`. GET `/devices/inventory/import/package-options` trả options active/complete và bundle components đủ để xem trước quyền lợi, không kèm PII. POST `/devices/inventory/import/confirm` nhận `{preview_id,assignments:[{row_id,package_ids}]}` với `Idempotency-Key`; trả `{items:[{row_id,serial,status:'added'|'skipped'|'failed',code,entitlements_attached}],added,skipped,failed,entitlements_attached}`. Types domain camelCase tương ứng; schema/mapper là nguồn duy nhất.

- [ ] Tạo Zod schemas nguồn nhập, preview, options và kết quả; ID không rỗng, package ID unique, kiểm tra tập assignment khớp preview phía mock.
- [ ] Viết parser CSV theo định dạng trên; reject header thiếu/trùng, thiếu serial/model, số ô sai, quote chưa đóng và file chỉ header. Không tự biến serial thành số, không bỏ số 0 đầu; serial trùng để backend xử lý.
- [ ] Thực hiện assert tạm ngoài file tracked cho BOM/CRLF/quoted comma/escaped quote, serial `000123`, dòng sai; không thêm framework/test files. Kiểm tra assert thực sự chạy và ghi kết quả.
- [ ] Thêm API parse boundary, mapper lỗi theo pattern hiện có, query factory options; key có prefix devices. Kiểm tra DTO lỗi bị từ chối, typecheck.
- [ ] Commit `feat(devices): define inventory import preview and confirmation contract`.

### Task 3: MSW preview/confirm và cấp quyền lợi có kiểm soát

**Files:** tạo `src/features/devices/mocks/inventoryImportHandlers.ts`, `src/mocks/stores/inventoryImportStore.ts`; sửa `src/mocks/stores/{inventoryStore.ts,entitlementStore.ts}`, `src/features/devices/mocks/deviceExtraHandlers.ts`, `src/mocks/handlers.ts`. Tái sử dụng `operationStore.ts` và audit hiện hữu.

**Interfaces:** handlers đúng Task 2; `inventoryImportStore` giữ preview bất biến theo actor. Tách sinh ứng viên kho khỏi ghi inventory: preview warehouse không gọi hàm push. `attachPackage` giữ chữ ký hiện có; bỏ model gate, thêm source `inventory_import` vào schema/mapper/i18n liên quan sau khi tìm hết consumer; giữ đọc source cũ.

- [ ] Trước sửa, tái hiện sync ghi ngay/auto-attach. Sau sửa, loại `attachAutoEntitlementsOnSync` và đóng endpoint sync ghi ngay cũ; không còn caller UI sau Task 4. Không xóa fixture lịch sử auto_attach.
- [ ] Preview kiểm quyền và validate, lưu row ID cố định/actor, không ghi inventory, entitlement hay audit ghi kho. Options dùng quyền nhập kho, lọc active/complete cả bundle; không lọc model/giá.
- [ ] Confirm kiểm quyền, ownership preview, exact row set, package IDs, bundle components và dữ liệu hiện tại trước mọi ghi. Expand bundle, dedupe ID; snapshot server-side với quota/thời hạn cũ; không yêu cầu free pricing/model scope.
- [ ] Dùng khóa idempotency gắn actor/route/payload trước kiểm tra preview đã dùng; replay trả cùng kết quả. Preview confirm thành công không được tái dùng với khóa mới. Lỗi mạng phía UI không đổi khóa/payload khi retry; request sửa sau rejection dùng khóa mới.
- [ ] Ghi từng máy mới và quyền lợi cùng audit actor/timestamp/before/after/reason/target; serial tồn tại skip, giữ quyền lợi cũ. Không dùng actor `system` cho lựa chọn nhân viên.
- [ ] Assert tạm: preview không ghi; hai model cùng gói có giá; bundle + direct không trùng; state đổi bị reject trước ghi; serial_exists; replay không tăng store/audit; key payload khác conflict; actor khác/thiếu quyền bị từ chối; old sync không tự gắn.
- [ ] Kiểm tra đọc entitlement/summary, snapshot và giữ chỗ cảnh báo lõi không đổi; typecheck/lint rồi commit `feat(devices): confirm inventory batches with selected entitlements`.

### Task 4: Wizard nhập kho và kết quả

**Files:** sửa `components/InventorySyncButton.tsx`; tạo cùng thư mục `InventoryImportWizard.tsx`, `InventoryImportDeviceTable.tsx`; tạo `utils/inventoryImportSelection.ts`; sửa locales devices VI/EN, schema/constants nguồn entitlement khi cần; dùng shared portal và Ant Design.

**Interfaces:** wizard gọi API Task 2; state gồm preview, commonPackageIds, overrides theo rowId và bước hiện tại. Hàm `resolveInventoryPackages(rowId, commonPackageIds, overrides): string[]`; override rỗng khác chưa override. Bảng phân trang/tìm kiếm dùng state được validate trong modal; không tạo route URL mới cho bản nháp nhạy cảm.

- [ ] Bật upload CSV, giới hạn file trước đọc; file mẫu; báo lỗi rõ. Auto source gọi preview. Chặn tiếp khi options lỗi và có retry, không coi tải lỗi là danh mục rỗng.
- [ ] Dựng bốn bước đã duyệt; selector searchable chỉ options Task 2. Chọn gói chung; per-row thêm/bỏ/reset; máy chỉnh riêng giữ tập riêng, máy khác kế thừa. Giữ draft khi quay lại, reset theo preview mới khi đổi nguồn.
- [ ] Review tính quyền lợi sau bundle dedupe, cho thấy phần tử component và máy chỉnh riêng; không gửi đến confirm trước nút cuối. Empty packages hợp lệ.
- [ ] Trong pending khóa sửa/đóng/submit; lỗi mạng giữ đúng request và operation key để retry. Validation rejection cho quay lại xem/sửa. Kết quả từng dòng và counts từ response; invalidate devices/inventory/counts/detail/entitlement query liên quan sau ghi.
- [ ] Thử bằng MSW: chỉnh máy đầu, đổi common, kiểm tra máy đầu không đổi; reset; no-package; đổi file; hủy; double click; timeout retry; lỗi một dòng; role chỉ nhập kho; VI/EN, keyboard, 10.000 dòng phân trang. Không render 10.000 selector đồng thời.
- [ ] Chạy bốn check; commit `feat(devices): add inventory service selection wizard`.

### Task 5: Tài liệu và kiểm chứng toàn luồng

**Files:** cập nhật `docs/SERVICE_PACKAGE_CATALOG.md`, spec/plan quyền lợi ngày 27/10 bằng ghi chú superseded cho model/auto-attach; không xóa lịch sử quyết định. Ghi bằng chứng kiểm chứng vào tài liệu feature, thêm ảnh UI nếu mở PR.

- [ ] Tìm toàn repo caller `syncInventory`, `receiveNewUnits`, autoAttach/modelScope và source enums; bỏ dead code/import/i18n dành riêng UI đã xóa, giữ DTO lịch sử và fixtures cần thiết.
- [ ] Chạy tuần tự `pnpm lint`, `pnpm typecheck`, `pnpm format:check`, `pnpm build`; ghi exit code, phân biệt warning có sẵn. Không chạy hai tsc build cùng lúc.
- [ ] Manually exercise từ upload → confirm → kho → entitlement detail/event log; warehouse cùng luồng; reload reset MSW như tài liệu. Kiểm tra forbidden, empty/loading/error và cảnh báo lõi hiện hữu.
- [ ] Review diff độc lập theo cách thực thi người dùng chọn; xử lý phát hiện thực sự, chạy lại check bị ảnh hưởng. Không tuyên bố backend/app đã tích hợp.
- [ ] Commit docs/verification liên quan; báo kết quả và giới hạn, không push tự động.

## Self-review

Đã đối chiếu: mọi quyết định spec có task; contract/source/selection state nhất quán;
năm Review Focus có bước kiểm chứng tương ứng. Định dạng file/hạn mức là quyết định
triển khai được trình người dùng ở kế hoạch này; không phải yêu cầu đã có của KGR.
