/**
 * 청첩장 뷰어(하객에게 보여지는 실제 화면) 컴포넌트들이 공유하는 데이터 타입.
 *
 * `app/create/types.ts`의 `InvitationFormData`(입력 폼 상태)와는 의도적으로 분리한다 —
 * 뷰어는 이미 확정된 값(이미지 URL 문자열, 완성된 성함 등)만 받으면 되고, 폼의 중간
 * 상태(File 객체, 미리보기 blob URL, 유효성 검사 등)는 알 필요가 없다.
 *
 * harness-0i2의 나머지 태스크(혼주연락처 / Gallery / 계좌 아코디언 / 하단바)가 이 파일에
 * 필드를 계속 추가해 나간다. 이 스토리(harness-0i2.1.1)에서는 Hero가 쓰는 필드만 채운다.
 * 나중에 harness-8lh.5(정적 페이지 생성)가 이 타입 그대로 실제 데이터를 채워 뷰어
 * 컴포넌트들을 정적 HTML로 렌더링할 것이므로, 필드는 최종 확정값 기준으로 유지한다.
 */
export interface InvitationViewData {
  /** 대표 이미지 URL. 로컬 blob URL(폼 미리보기)이든 최종 호스팅 URL이든 그대로 받는다. */
  mainImageUrl: string;
  /**
   * `<input type="datetime-local">` 값 형식 (예: "2026-08-01T12:30").
   * 예식 시각은 초대장에 적힌 그대로 보여줘야 하므로(하객의 타임존에 따라 달라지면 안
   * 됨), 이 문자열은 Date 객체로 변환해 로컬 타임존으로 재해석하지 않고 문자열 그대로
   * 파싱해서 표시한다 (`formatWeddingDateTime` 참고).
   */
  weddingDateTime: string;
  groomName: string;
  brideName: string;
}
