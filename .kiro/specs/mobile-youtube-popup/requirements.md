# Requirements Document

## Introduction

Cải thiện trải nghiệm xem video hướng dẫn tập luyện trên thiết bị di động bằng cách hiển thị YouTube trong popup thay vì chuyển hướng sang ứng dụng hoặc trang mới. Người dùng có thể xem video ngay trong ứng dụng và dễ dàng đóng popup để quay lại kế hoạch tập luyện.

## Glossary

- **System**: Ứng dụng Grow Up (ứng dụng tập luyện)
- **Mobile Device**: Thiết bị di động (smartphone, tablet) chạy iOS hoặc Android
- **Desktop Device**: Máy tính để bàn hoặc laptop
- **YouTube Popup**: Cửa sổ popup hiển thị trang m.youtube.com
- **Exercise Link**: Liên kết đến video hướng dẫn bài tập trên YouTube
- **Deep Link**: Liên kết mở trực tiếp ứng dụng YouTube native

## Requirements

### Requirement 1

**User Story:** Là người dùng mobile, tôi muốn xem video hướng dẫn bài tập trong popup, để tôi không phải rời khỏi ứng dụng và mất tiến độ tập luyện.

#### Acceptance Criteria

1. WHEN người dùng bấm vào tên bài tập trên Mobile Device, THE System SHALL hiển thị YouTube Popup với URL m.youtube.com
2. THE System SHALL hiển thị nút đóng popup rõ ràng trên YouTube Popup
3. WHEN người dùng bấm nút đóng, THE System SHALL đóng YouTube Popup và giữ nguyên trạng thái trang hiện tại
4. THE System SHALL không sử dụng Deep Link để mở ứng dụng YouTube native trên Mobile Device
5. THE System SHALL hiển thị YouTube Popup với kích thước toàn màn hình trên Mobile Device

### Requirement 2

**User Story:** Là người dùng desktop, tôi muốn video YouTube mở trong tab mới, để tôi có thể xem video trên màn hình rộng hơn và dễ dàng chuyển đổi giữa các tab.

#### Acceptance Criteria

1. WHEN người dùng bấm vào tên bài tập trên Desktop Device, THE System SHALL mở YouTube trong tab mới của trình duyệt
2. THE System SHALL không hiển thị YouTube Popup trên Desktop Device
3. THE System SHALL sử dụng URL www.youtube.com cho Desktop Device

### Requirement 3

**User Story:** Là người dùng, tôi muốn popup có giao diện đẹp và dễ sử dụng, để trải nghiệm xem video mượt mà và chuyên nghiệp.

#### Acceptance Criteria

1. THE System SHALL hiển thị YouTube Popup với nền overlay tối mờ (backdrop)
2. THE System SHALL hiển thị nút đóng với icon rõ ràng (X hoặc Close)
3. THE System SHALL cho phép người dùng đóng popup bằng cách bấm vào backdrop
4. THE System SHALL hiển thị animation mượt mà khi mở và đóng popup
5. THE System SHALL đảm bảo nút đóng luôn hiển thị trên cùng và dễ tiếp cận
