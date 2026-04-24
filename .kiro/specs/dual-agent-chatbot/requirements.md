# Requirements Document

## Introduction

Tính năng Dual-Agent Chatbot tích hợp vào trang `chat-tutor` của nền tảng học tập ĐKTN. Hệ thống sử dụng kiến trúc hai agent để đảm bảo mọi phản hồi gửi đến học sinh đều tuân thủ phương pháp Socratic — không bao giờ cung cấp đáp án trực tiếp, chỉ đặt câu hỏi gợi mở để kích thích tư duy chủ động.

**Agent 1** là model đã được fine-tune trên máy local (chạy qua Ollama), chuyên sinh câu hỏi gợi mở Socratic bằng tiếng Việt.  
**Agent 2** là Gemini API, đóng vai trò kiểm duyệt chất lượng phản hồi của Agent 1 và fallback khi Agent 1 thất bại liên tiếp.

Hệ thống tích hợp vào backend FastAPI hiện có (`/student/chat`) và frontend Next.js (`chat-tutor/page.tsx`), sử dụng các model/schema đã có (`ChatSession`, `ChatSessionResponse`).

---

## Glossary

- **Dual_Agent_System**: Hệ thống điều phối hai agent AI (Agent 1 và Agent 2) để xử lý yêu cầu chat Socratic.
- **Agent_1**: Model ngôn ngữ đã được fine-tune trên local, chạy qua Ollama API, có nhiệm vụ sinh câu hỏi gợi mở Socratic.
- **Agent_2**: Gemini API (gemini-2.0-flash), đóng vai trò validator và fallback generator.
- **Validator**: Chức năng của Agent_2 kiểm tra xem phản hồi của Agent_1 có vi phạm nguyên tắc Socratic không.
- **Socratic_Response**: Phản hồi hợp lệ — chỉ đặt câu hỏi gợi mở hoặc gợi ý hướng tiếp cận, không cung cấp đáp án, công thức, hay lời giải trực tiếp.
- **Direct_Answer**: Phản hồi vi phạm — cung cấp đáp án, code hoàn chỉnh, công thức, hoặc lời giải trực tiếp mà học sinh không cần tự suy luận.
- **Retry_Cycle**: Một lần Agent_2 từ chối phản hồi của Agent_1 và yêu cầu Agent_1 sinh lại kèm feedback.
- **Fallback**: Trạng thái Agent_2 tự đảm nhận vai trò sinh Socratic_Response sau khi Agent_1 thất bại đủ số lần tối đa.
- **Validation_Score**: Điểm chất lượng (0–100) do Agent_2 chấm cho mỗi phản hồi Socratic.
- **Chat_Orchestrator**: Module backend (`dual_chat_engine.py`) điều phối toàn bộ flow giữa Agent_1 và Agent_2.
- **Chat_API**: Endpoint FastAPI `POST /student/chat` nhận yêu cầu từ frontend và trả về phản hồi Socratic.
- **Chat_UI**: Giao diện chat trên trang `chat-tutor` của frontend Next.js.
- **Student**: Người dùng học sinh sử dụng tính năng chat.

---

## Requirements

### Requirement 1: Xử lý tin nhắn học sinh qua Dual-Agent System

**User Story:** As a Student, I want to send a question and receive a Socratic response, so that I am guided to think independently rather than receiving direct answers.

#### Acceptance Criteria

1. WHEN a Student submits a message via the Chat_UI, THE Chat_API SHALL forward the message along with `student_id` and `topic_name` to the Chat_Orchestrator within 500ms.
2. WHEN the Chat_Orchestrator receives a message, THE Chat_Orchestrator SHALL invoke Agent_1 to generate a response before invoking Agent_2.
3. WHEN Agent_1 returns a response, THE Chat_Orchestrator SHALL invoke the Validator to evaluate whether the response is a Direct_Answer or a Socratic_Response.
4. WHEN the Validator determines the response is a Socratic_Response, THE Chat_Orchestrator SHALL return Agent_1's response as the final reply without further retries.
5. WHEN the Validator determines the response is a Direct_Answer, THE Chat_Orchestrator SHALL initiate a Retry_Cycle by re-invoking Agent_1 with the Validator's rejection reason as feedback.
6. WHEN the number of Retry_Cycles reaches 3 without a passing Socratic_Response, THE Chat_Orchestrator SHALL activate Fallback and invoke Agent_2 to generate the final Socratic_Response.
7. WHEN Agent_1 is unreachable (connection error), THE Chat_Orchestrator SHALL immediately activate Fallback without consuming any Retry_Cycles.
8. WHEN both Agent_1 and Agent_2 fail to respond, THE Chat_Orchestrator SHALL return a user-friendly error message in Vietnamese to the Chat_UI.

---

### Requirement 2: Kiểm duyệt chất lượng phản hồi bởi Agent 2 (Validator)

**User Story:** As a platform administrator, I want Agent 2 to enforce Socratic quality on every Agent 1 response, so that students never receive direct answers regardless of Agent 1's behavior.

#### Acceptance Criteria

1. WHEN the Validator evaluates a response, THE Validator SHALL classify the response as either `is_direct_answer: true` or `is_direct_answer: false`.
2. WHEN the Validator classifies a response, THE Validator SHALL assign a Validation_Score between 0 and 100 reflecting the Socratic quality of the response.
3. WHEN the Validator classifies a response as a Direct_Answer, THE Validator SHALL provide a `reason` string in Vietnamese explaining the specific violation.
4. WHEN Agent_1 is retrying after a rejection, THE Chat_Orchestrator SHALL include the Validator's `reason` from the previous rejection in Agent_1's system context.
5. THE Validator SHALL classify a response as a Direct_Answer IF the response contains a complete solution, formula, code snippet, or final answer that eliminates the need for the Student to reason independently.
6. THE Validator SHALL classify a response as a Socratic_Response IF the response contains at least one open-ended question or a conceptual hint that guides the Student toward self-discovery.

---

### Requirement 3: Fallback — Agent 2 đảm nhận vai trò gia sư Socratic

**User Story:** As a Student, I want to always receive a helpful Socratic response even when the local model fails repeatedly, so that my learning session is never blocked.

#### Acceptance Criteria

1. WHEN Fallback is activated, THE Chat_Orchestrator SHALL invoke Agent_2 in Socratic generation mode (not validation mode) using the original student message and topic.
2. WHEN Agent_2 generates a Fallback response, THE Fallback response SHALL comply with the same Socratic_Response definition as Agent_1 responses (no Direct_Answer).
3. WHEN the Chat_API returns a Fallback response, THE Chat_API SHALL include `agent_used: "agent_2"` and `retry_count: 3` in the response payload.
4. WHEN the Chat_UI receives a response with `agent_used: "agent_2"`, THE Chat_UI SHALL display a visual indicator (e.g., "Gemini Fallback" badge) distinguishing it from Agent_1 responses.

---

### Requirement 4: Lưu trữ metadata dual-agent vào cơ sở dữ liệu

**User Story:** As a platform administrator, I want every chat interaction to be stored with dual-agent metadata, so that I can audit quality, monitor retry patterns, and improve the system over time.

#### Acceptance Criteria

1. WHEN the Chat_Orchestrator returns a final response, THE Chat_API SHALL persist a `ChatSession` record containing `messages`, `agent_used`, `retry_count`, and `validation_score`.
2. WHEN `agent_used` is stored, THE Chat_API SHALL store the value as either `"agent_1"` or `"agent_2"` corresponding to which agent produced the final response.
3. WHEN `retry_count` is stored, THE Chat_API SHALL store the exact number of Retry_Cycles that occurred before the final response was accepted (0 to 3).
4. WHEN `validation_score` is stored, THE Chat_API SHALL store the Validation_Score from the last successful validation (or the last attempted validation if Fallback was triggered).
5. THE Chat_API SHALL store both the student's message (`role: "user"`) and the final AI response (`role: "ai"`) in the `messages` JSONB field of the `ChatSession` record.

---

### Requirement 5: Hiển thị trạng thái dual-agent trên giao diện chat

**User Story:** As a Student, I want to see which AI agent responded to my message, so that I understand the system's behavior and trust the quality of responses.

#### Acceptance Criteria

1. WHEN the Chat_UI receives a response from the Chat_API, THE Chat_UI SHALL display the `agent_used` value as a badge on the tutor's message bubble.
2. WHEN `agent_used` is `"agent_1"`, THE Chat_UI SHALL display a badge labeled "Local AI" with indigo styling.
3. WHEN `agent_used` is `"agent_2"`, THE Chat_UI SHALL display a badge labeled "Gemini Fallback" with fuchsia styling.
4. WHILE a response is being generated, THE Chat_UI SHALL display an animated loading indicator (three bouncing dots) in the tutor's message area.
5. WHEN the Chat_API returns an error, THE Chat_UI SHALL display an error message in Vietnamese prefixed with "⚠️ Lỗi:" without crashing the chat session.

---

### Requirement 6: Cấu hình và khả năng mở rộng của Dual-Agent System

**User Story:** As a developer, I want the dual-agent system to be configurable via environment variables, so that I can adjust behavior without modifying source code.

#### Acceptance Criteria

1. THE Chat_Orchestrator SHALL read `AGENT1_BASE_URL` from environment variables to determine the Ollama endpoint for Agent_1.
2. THE Chat_Orchestrator SHALL read `AGENT1_MODEL_NAME` from environment variables to determine which fine-tuned model Agent_1 uses.
3. THE Chat_Orchestrator SHALL read `AGENT2_MAX_RETRIES` from environment variables to determine the maximum number of Retry_Cycles before Fallback is triggered.
4. THE Chat_Orchestrator SHALL read `GEMINI_API_KEY` from environment variables to authenticate with the Gemini API for Agent_2.
5. WHERE `AGENT2_MAX_RETRIES` is not set, THE Chat_Orchestrator SHALL default to a maximum of 3 Retry_Cycles.
6. WHEN Agent_1 times out after 60 seconds without a response, THE Chat_Orchestrator SHALL treat the timeout as a connection error and activate Fallback.

---

### Requirement 7: Tích hợp lịch sử chat vào giao diện

**User Story:** As a Student, I want my previous chat sessions to be loaded when I open the chat page, so that I can continue learning from where I left off.

#### Acceptance Criteria

1. WHEN the Chat_UI is initialized for a Student, THE Chat_UI SHALL call `GET /student/{student_id}/chat-sessions` to retrieve existing `ChatSession` records.
2. WHEN chat history is loaded, THE Chat_UI SHALL flatten all session messages into a chronological list and display them in the message area.
3. WHEN a loaded message has `agent_used` metadata, THE Chat_UI SHALL display the corresponding agent badge on that message.
4. WHILE chat history is loading, THE Chat_UI SHALL display a loading spinner with the text "Đang tải lịch sử chat...".
5. IF the `GET /student/{student_id}/chat-sessions` request fails, THEN THE Chat_UI SHALL display an empty chat state without blocking the Student from sending new messages.
