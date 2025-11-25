# Implementation Plan

- [x] 1. Tạo YouTubePopup component với UI cơ bản





  - Tạo file `components/YouTubePopup.tsx` với TypeScript interface
  - Implement backdrop overlay với dark background và blur effect
  - Implement popup container với close button ở góc trên phải
  - Implement iframe để hiển thị m.youtube.com với search query
  - Sử dụng Tailwind CSS classes phù hợp với theme hiện tại (glass morphism)
  - _Requirements: 1.1, 1.2, 3.1, 3.2, 3.5_

- [x] 2. Implement popup interaction logic





  - [x] 2.1 Xử lý đóng popup khi click close button


    - Add onClick handler cho close button gọi onClose callback
    - _Requirements: 1.3_
  
  - [x] 2.2 Xử lý đóng popup khi click backdrop


    - Add onClick handler cho backdrop element
    - Prevent event bubbling từ popup content
    - _Requirements: 3.3_
  
  - [x] 2.3 Prevent body scroll khi popup mở


    - Add useEffect để toggle body overflow style
    - Cleanup khi component unmount
    - _Requirements: 1.5_

- [x] 3. Implement animations cho popup





  - Add CSS transitions cho opacity và scale transform
  - Implement enter animation (fade in + scale up)
  - Implement exit animation (fade out + scale down)
  - Sử dụng Tailwind transition utilities
  - _Requirements: 3.4_

- [x] 4. Integrate YouTubePopup vào PlanDisplay component





  - [x] 4.1 Import YouTubePopup component vào PlanDisplay.tsx


    - Add import statement
    - _Requirements: 1.1_
  
  - [x] 4.2 Add state management cho popup


    - Tạo state `youtubePopup` với isOpen và searchQuery
    - _Requirements: 1.1_
  
  - [x] 4.3 Modify handleOpenYouTube function


    - Giữ nguyên device detection logic
    - Thay thế deep linking code bằng setYoutubePopup cho mobile
    - Giữ nguyên window.open cho desktop
    - _Requirements: 1.1, 1.4, 2.1, 2.2, 2.3_
  
  - [x] 4.4 Render YouTubePopup component trong JSX


    - Add component với props isOpen, onClose, searchQuery
    - Position component ở cuối return statement
    - _Requirements: 1.1_

- [x] 5. Xóa deep linking code không cần thiết





  - Remove iOS deep linking logic (youtube:// URL scheme)
  - Remove Android deep linking logic (vnd.youtube:// URL scheme)
  - Remove setTimeout fallback logic cho deep linking
  - Clean up comments liên quan đến deep linking
  - _Requirements: 1.4_

- [x] 6. Testing và validation





  - [x] 6.1 Test device detection


    - Verify mobile user agents trigger popup
    - Verify desktop user agents trigger new tab
    - _Requirements: 1.1, 2.1_
  
  - [x] 6.2 Test popup interactions


    - Verify close button đóng popup
    - Verify backdrop click đóng popup
    - Verify iframe content click không đóng popup
    - _Requirements: 1.3, 3.3_
  

  - [x] 6.3 Test responsive design

    - Verify full-screen trên mobile
    - Verify animation mượt mà
    - Verify body scroll bị prevent
    - _Requirements: 1.5, 3.4_
