'use client';

import { useState } from 'react';
import InvitationForm from './InvitationForm';
import InvitationPreview from './InvitationPreview';
import { createEmptyInvitationFormData, type InvitationFormData } from './types';

type Stage = 'form' | 'preview';

export default function CreateInvitationPage() {
  const [stage, setStage] = useState<Stage>('form');
  const [previewData, setPreviewData] = useState<InvitationFormData>(createEmptyInvitationFormData);

  // InvitationForm은 언마운트하지 않고 CSS로만 숨긴다 — 언마운트하면
  // blob 미리보기 URL을 정리하는 cleanup effect가 돌아 이미지가 깨지고,
  // '편집'으로 돌아왔을 때 입력값을 되살리는 로직도 따로 필요해진다.
  // 같은 컴포넌트 인스턴스를 계속 살려두면 두 문제 모두 자연히 해결된다.
  return (
    <>
      <div style={{ display: stage === 'form' ? undefined : 'none' }}>
        <InvitationForm
          onSubmitSuccess={(data) => {
            setPreviewData(data);
            setStage('preview');
          }}
        />
      </div>
      {stage === 'preview' && (
        <InvitationPreview data={previewData} onEdit={() => setStage('form')} />
      )}
    </>
  );
}
