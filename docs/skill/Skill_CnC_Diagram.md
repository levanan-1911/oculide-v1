# Skill: Quy tắc và chuẩn ký hiệu C&C Diagram

## 1. Mục đích

Skill này hướng dẫn AI hoặc người thiết kế tạo, rà soát và chỉnh sửa sơ
đồ Component & Connector (C&C) trong tài liệu kiến trúc phần mềm, đặc
biệt là ADD (Architecture Design Document).

Mục tiêu của C&C Diagram là mô tả: - Các thành phần kiến trúc
(components). - Trách nhiệm của từng thành phần. - Các cơ chế tương tác
(connectors). - Các điểm giao tiếp (ports/interfaces), nếu notation được
chọn có sử dụng. - Ranh giới hệ thống và các dịch vụ bên ngoài.

**Không nhầm C&C view theo Software Architecture với UML Component
Diagram.** Hai cách biểu diễn có liên quan nhưng không đồng nhất. Trước
khi vẽ, phải xác định notation theo yêu cầu của giảng viên, tài liệu
hoặc dự án. Nếu có mẫu sơ đồ được cung cấp, ưu tiên mẫu đó.

------------------------------------------------------------------------

## 2. Nguyên tắc bắt buộc

### 2.1 Component

-   Component là đơn vị kiến trúc có trách nhiệm rõ ràng, thường đại
    diện cho module, service, subsystem hoặc đơn vị xử lý/lưu trữ.
-   Đặt tên ngắn gọn, có ý nghĩa, nhất quán; ví dụ: `Inventory Service`,
    `Forecasting Service`, `Backend API`.
-   Không biểu diễn từng hàm, biến, class hoặc endpoint thành component
    trong sơ đồ kiến trúc tổng thể.
-   Mỗi component cần có trách nhiệm đủ rõ để người đọc hiểu vì sao nó
    tồn tại.

### 2.2 Connector

-   Connector biểu diễn **cơ chế tương tác**, không phải đường nối trang
    trí.
-   Có thể là: API call, function call, message/event, database access,
    data stream hoặc giao thức giao tiếp.
-   Đặt nhãn connector khi loại tương tác không thể suy ra rõ từ sơ đồ.
-   Hướng mũi tên phải phản ánh đúng ý nghĩa đã quy định trong Legend.
-   Không mặc định mọi đường liền là API, mọi đường nét đứt là
    dependency. Đây chỉ có thể là quy ước của sơ đồ nếu được ghi rõ.

### 2.3 Port

-   Trong C&C notation có sử dụng port, port là điểm giao tiếp của
    component với connector hoặc môi trường.
-   Port thường được đặt trên biên component và có thể được đặt tên theo
    chức năng.
-   Connector được gắn vào port theo notation đã chọn.
-   Không cần tạo port cho mọi thao tác nội bộ.
-   Nếu sơ đồ theo mẫu đơn giản không thể hiện port, không tự ý thêm ký
    hiệu UML port nếu làm sơ đồ lệch chuẩn của môn học.

### 2.4 Interface

-   Interface mô tả dịch vụ mà component cung cấp hoặc cần sử dụng.
-   Trong UML Component Diagram:
    -   **Provided Interface**: component cung cấp dịch vụ; ký hiệu UML
        thường là hình tròn "lollipop".
    -   **Required Interface**: component cần dịch vụ; ký hiệu UML
        thường là hình bán nguyệt "socket".
-   Interface không phải connector: interface mô tả hợp đồng/dịch vụ,
    connector thể hiện việc kết nối hoặc tương tác.
-   Chỉ thể hiện interface khi nó giúp người đọc hiểu kiến trúc; tránh
    làm sơ đồ tổng thể quá tải.

### 2.5 Actor và ranh giới hệ thống

-   Actor là người dùng hoặc hệ thống bên ngoài tương tác với hệ thống;
    không phải component nội bộ.
-   Actor thường đặt ngoài ranh giới hệ thống.
-   Component do hệ thống sở hữu/triển khai đặt trong ranh giới hệ
    thống.
-   External service như Weather API, Zalo hoặc cổng thanh toán nên đặt
    ngoài ranh giới hệ thống nếu thuộc bên thứ ba.
-   Không vẽ Actor truy cập trực tiếp Database trong kiến trúc web thông
    thường.
-   Web UI không nên truy cập trực tiếp Database nếu kiến trúc quy định
    backend chịu trách nhiệm truy cập dữ liệu.

### 2.6 Database và dữ liệu

-   Database có thể được thể hiện là component lưu trữ hoặc datastore
    tùy notation.
-   Không biến từng bảng ERD thành component trong C&C tổng thể.
-   Nếu có nhiều database hoặc datastore, chỉ tách khi chúng có ý nghĩa
    kiến trúc riêng.
-   Connector truy cập dữ liệu cần thể hiện đúng hướng và chủ thể truy
    cập.

------------------------------------------------------------------------

## 3. Ký hiệu thường dùng

### 3.1 C&C theo Software Architecture (SEI-style)

Các khái niệm cốt lõi: - **Component**: đơn vị xử lý hoặc lưu trữ dữ
liệu. - **Connector**: cơ chế tương tác giữa components. - **Port**:
điểm giao tiếp của component. - **Role**: vai trò mà component đảm nhận
khi tham gia connector. - **Attachment**: quan hệ gắn port với
connector.

Không có một hình dạng đồ họa duy nhất bắt buộc cho mọi C&C notation.
Phải dùng notation được quy định trong tài liệu/mẫu và giải thích trong
Legend.

### 3.2 UML Component Diagram

Các ký hiệu UML thường gặp:

  -----------------------------------------------------------------------
  Ký hiệu                 Tên                     Ý nghĩa
  ----------------------- ----------------------- -----------------------
  Hình chữ nhật có biểu   Component               Thành phần phần mềm
  tượng component hoặc                            
  stereotype                                      
  `<<component>>`                                 

  Ô nhỏ trên biên         Port                    Điểm giao tiếp
  component                                       

  Hình tròn "lollipop"    Provided Interface      Interface được cung cấp

  Hình bán nguyệt         Required Interface      Interface được yêu cầu
  "socket"                                        

  Đường nối giữa provided Assembly Connector      Kết nối dịch vụ được
  và required interface                           cung cấp với dịch vụ
                                                  được yêu cầu

  Connector từ port bên   Delegation Connector    Chuyển tiếp giao tiếp
  ngoài đến phần tử bên                           
  trong component                                 

  Đường nét đứt có mũi    Dependency              Quan hệ phụ thuộc
  tên                                             

  Hình người              Actor                   Tác nhân bên ngoài
  -----------------------------------------------------------------------

**Chú ý:** Hình trụ cho Database, đường liền cho API, đường nét đứt cho
dependency hoặc màu sắc riêng là quy ước trình bày thường dùng, không
phải lúc nào cũng là quy định bắt buộc của UML Component Diagram.

### 3.3 Phân biệt Assembly và Delegation Connector

-   **Assembly Connector** nối interface được cung cấp với interface
    được yêu cầu giữa các component.
-   **Delegation Connector** chuyển tiếp giao tiếp từ port/interface của
    component bao ngoài đến port/interface của component bên trong (hoặc
    ngược lại theo hướng giao tiếp).
-   Không dùng hai loại connector này thay thế nhau.

------------------------------------------------------------------------

## 4. Quy tắc về hướng mũi tên

Trước khi vẽ, xác định rõ sơ đồ biểu diễn: 1. Luồng request/call; 2.
Luồng dữ liệu; 3. Quan hệ phụ thuộc; 4. Hay một connector hai chiều.

Quy tắc gợi ý: - Request từ A đến B: A → B. - Dữ liệu được gửi từ A đến
B: A → B. - Dependency: component sử dụng dịch vụ phụ thuộc vào
component cung cấp dịch vụ; hướng mũi tên phải theo notation đã chọn. -
Database access: component truy cập → Database, nếu connector biểu diễn
hành động truy cập. - Request và response có thể cần hai mũi tên hoặc
một connector hai chiều được chú giải. Không tự suy diễn rằng một mũi
tên thể hiện cả hai chiều.

**Không trộn hướng mũi tên theo nhiều ý nghĩa trong cùng sơ đồ nếu không
có Legend rõ ràng.**

------------------------------------------------------------------------

## 5. Quy tắc bố cục

-   Chọn một hướng đọc chính: trái → phải hoặc trên → dưới.
-   Đặt component theo layer hoặc nhóm trách nhiệm: Presentation,
    Application/Business, Data, External Services.
-   Đặt component có tương tác thường xuyên gần nhau.
-   Hạn chế đường connector giao nhau, chạy vòng hoặc xuyên qua nhiều
    component.
-   Tránh connector chồng lên tên component, port hoặc nhãn.
-   Dùng đường gấp khúc và bố trí lại component trước khi dùng đường nối
    vòng.
-   Nếu sơ đồ quá dày, tách thành các view/diagram nhỏ theo subsystem
    hoặc concern; không cố nhét mọi chi tiết vào một trang.
-   Duy trì kích thước, kiểu chữ, màu sắc và khoảng cách nhất quán.
-   Màu sắc chỉ hỗ trợ phân nhóm, không thay thế nhãn hoặc Legend.

------------------------------------------------------------------------

## 6. Phạm vi thông tin C&C Diagram

### Nên thể hiện

-   Component kiến trúc quan trọng.
-   Trách nhiệm hoặc tên component.
-   Connector và cơ chế tương tác.
-   Port/interface nếu notation yêu cầu hoặc cần làm rõ.
-   Actor và external system.
-   System boundary.
-   Database/datastore ở mức kiến trúc.
-   Legend.

### Không nên đưa vào C&C tổng thể

-   Chi tiết từng class, method, variable.
-   Từng bảng/cột database như ERD.
-   Toàn bộ API endpoint.
-   Các bước nghiệp vụ chi tiết như flowchart.
-   Các thông điệp theo thời gian như Sequence Diagram.
-   Các trạng thái UI hoặc mockup màn hình.
-   Chi tiết triển khai không ảnh hưởng đến cấu trúc kiến trúc.

Nếu cần, hãy tạo Class Diagram, ERD, Sequence Diagram hoặc Deployment
Diagram riêng.

------------------------------------------------------------------------

## 7. Legend (chú giải)

Mọi sơ đồ cần có Legend khi ký hiệu hoặc màu sắc có thể gây hiểu nhầm.

Legend nên giải thích: - Component. - Actor. - Database/datastore. -
Connector và hướng mũi tên. - API/call, event/message, data access,
dependency nếu có dùng. - Port/interface nếu có dùng. - System
boundary. - Ý nghĩa màu sắc hoặc đường nét riêng.

**Không tự đặt ký hiệu rồi trình bày như ký hiệu UML chuẩn.** Hãy ghi rõ
đó là "quy ước của sơ đồ" trong Legend.

Ví dụ Legend tùy chỉnh:

  Ký hiệu                    Ý nghĩa
  -------------------------- ----------------------------------
  Hình chữ nhật              Component
  Hình người                 Actor
  Hình trụ                   Database (quy ước đồ họa)
  Đường liền có mũi tên      Synchronous call (quy ước sơ đồ)
  Đường nét đứt có mũi tên   Dependency (quy ước sơ đồ)
  Connector ghi `Event`      Event/message
  Khung bao                  System boundary

------------------------------------------------------------------------

## 8. Quy trình tạo C&C Diagram

1.  Xác định mục tiêu và phạm vi sơ đồ.
2.  Xác định notation: C&C theo SEI, UML Component Diagram hay notation
    theo mẫu môn học.
3.  Xác định system boundary và actor/external systems.
4.  Liệt kê component kiến trúc và trách nhiệm.
5.  Xác định connector: cơ chế giao tiếp, hướng, đồng bộ/bất đồng bộ.
6.  Xác định port/interface nếu cần.
7.  Nhóm component theo layer hoặc trách nhiệm.
8.  Vẽ các kết nối chính trước, kết nối phụ sau.
9.  Bổ sung nhãn connector và Legend.
10. Rà soát tính đúng kiến trúc, tính nhất quán notation và khả năng
    đọc.

------------------------------------------------------------------------

## 9. Checklist kiểm tra trước khi nộp

-   [ ] Đã xác định notation theo yêu cầu của giảng viên/tài liệu.
-   [ ] System boundary rõ ràng.
-   [ ] Actor và external systems ở đúng phía.
-   [ ] Component có trách nhiệm kiến trúc rõ.
-   [ ] Không chia component quá nhỏ theo class/hàm.
-   [ ] Connector mô tả cơ chế tương tác thực tế.
-   [ ] Hướng mũi tên nhất quán và có ý nghĩa.
-   [ ] Port/interface được dùng đúng notation.
-   [ ] Không nối Actor trực tiếp với Database.
-   [ ] Không cho Web UI truy cập Database trái với kiến trúc.
-   [ ] Không nhầm Assembly Connector và Delegation Connector.
-   [ ] Không trộn ký hiệu UML với quy ước riêng mà thiếu chú giải.
-   [ ] Không đưa chi tiết ERD, class hoặc sequence vào sơ đồ tổng thể.
-   [ ] Đường nối hạn chế giao nhau và không che nhãn.
-   [ ] Có Legend đầy đủ.
-   [ ] Sơ đồ phản ánh kiến trúc dự kiến triển khai.

------------------------------------------------------------------------

## 10. Ví dụ áp dụng: SME Inventory Agent

Một kiến trúc C&C tổng thể có thể gồm:

### Actors / External Systems

-   Store Owner / Staff.
-   Weather API.
-   Supplier / Zalo Integration.

### Components

-   Web UI.
-   Backend API.
-   Inventory Service.
-   Sales Service.
-   Forecasting Service.
-   Procurement Agent.
-   Supplier Service.
-   Notification Service.
-   Inventory Database.

### Luồng tương tác minh họa

`Store Owner → Web UI → Backend API → Inventory Service → Inventory Database`

`Backend API → Forecasting Service → Weather API`

`Procurement Agent → Supplier Service`

`Procurement Agent → Notification Service → Store Owner`

`Store Owner approval → Backend API → Procurement Agent → Supplier/Zalo Integration`

Đây chỉ là ví dụ khái niệm. Khi vẽ chính thức, cần xác nhận component,
connector và tích hợp thực tế của dự án; không thể hiện tính năng chưa
được thiết kế hoặc triển khai như thể đã có sẵn.

------------------------------------------------------------------------

## 11. Nguồn tham khảo

-   SEI/CMU, *Documenting Software Architectures: Views and Beyond*:
    https://resources.sei.cmu.edu/asset_files/TechnicalReport/2004_005_001_14387.pdf
-   OMG, *Unified Modeling Language (UML)*:
    https://www.omg.org/spec/UML/

## 12. Hướng dẫn sử dụng skill

Khi được yêu cầu tạo hoặc chỉnh sửa C&C Diagram: 1. Đọc yêu cầu và mẫu
sơ đồ của người dùng trước. 2. Không tự giả định UML Component Diagram
là notation bắt buộc nếu đề bài chỉ yêu cầu C&C. 3. Hỏi làm rõ notation
chỉ khi thiếu thông tin và nó ảnh hưởng đáng kể đến kết quả. 4. Áp dụng
các quy tắc trong skill. 5. Phân biệt ký hiệu chuẩn với quy ước tự đặt.
6. Ưu tiên sơ đồ dễ đọc, chính xác kiến trúc và có Legend. 7. Nếu phát
hiện sơ đồ không nhất quán, nêu rõ vấn đề và đề xuất sửa.
