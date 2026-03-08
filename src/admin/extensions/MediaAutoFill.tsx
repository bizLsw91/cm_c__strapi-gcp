// src/admin/extensions/MediaAutoFill.tsx
import { useEffect, useRef } from 'react';
import { unstable_useContentManagerContext as useContentManagerContext } from '@strapi/strapi/admin';
import { useFetchClient } from '@strapi/strapi/admin';

const FIELD_MAPPINGS = [
  {
    mediaField: 'PDF',
    targetField: 'PDF_FILE_NAME',
    stripExtension: true,
  },
];

const MediaAutoFill = () => {
  const context = useContentManagerContext();
  const prevValues = useRef<Record<string, string | null>>({});
  const { get } = useFetchClient();

  const model = context?.model;
  const values = context?.form?.values;
  const onChange = context?.form?.onChange;

  const isDocCollection = model === 'api::doc.doc';

  useEffect(() => {
    if (!isDocCollection || !values || !onChange) return;

    FIELD_MAPPINGS.forEach(async ({ mediaField, targetField, stripExtension }) => {
      const mediaValue = values?.[mediaField];
      const file = Array.isArray(mediaValue) ? mediaValue[0] : mediaValue;

      // ✅ 핵심 디버깅: 실제 객체 구조 확인
      console.log(`[MediaAutoFill] RAW file object:`, JSON.stringify(file, null, 2));

      if (!file) {
        prevValues.current[mediaField] = null;
        return;
      }

      // name이 있으면 바로 사용 (새 업로드 케이스)
      let rawName: string | undefined = file?.name;

      // ✅ name이 없고 id만 있을 때 (기존 에셋 선택 케이스) → API로 파일명 조회
      if (!rawName && (file?.id || file?.documentId)) {
        try {
          const fileId = file?.id;
          const res = await get(`/upload/files/${fileId}`);
          rawName = res?.data?.name;
          console.log(`[MediaAutoFill] Fetched from API:`, res?.data);
        } catch (e) {
          console.error(`[MediaAutoFill] API fetch failed:`, e);
        }
      }

      if (!rawName) {
        prevValues.current[mediaField] = null;
        return;
      }

      const fileName = stripExtension
        ? rawName.replace(/\.[^/.]+$/, '')
        : rawName;

      if (prevValues.current[mediaField] === rawName) return;
      prevValues.current[mediaField] = rawName;

      onChange(targetField, fileName);
      console.log(`[MediaAutoFill] Auto-filled "${targetField}" with "${fileName}"`);
    });
  }, [values?.PDF, isDocCollection, onChange]);

  return null;
};

export default MediaAutoFill;
