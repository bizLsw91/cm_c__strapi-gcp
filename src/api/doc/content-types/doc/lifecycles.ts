import path from 'path';
import { errors } from '@strapi/utils';

const { ApplicationError } = errors;

console.log('@@@ [Lifecycle DEBUG] doc lifecycles.ts file has been loaded @@@');

export default {
  async beforeCreate(event) {
    console.log('@@@ [Lifecycle DEBUG] beforeCreate event triggered @@@');
    await validateAndUpdatePdf(event);
  },

  async beforeUpdate(event) {
    console.log('@@@ [Lifecycle DEBUG] beforeUpdate event triggered @@@');
    await validateAndUpdatePdf(event);
  },
};

/**
 * PDF 필드를 검증하고 파일명을 추출하여 PDF_FILE_NAME 필드에 주입합니다.
 */
async function validateAndUpdatePdf(event) {
  const { data } = event.params;

  // 디버깅을 위한 데이터 로그 출력
  console.log('[Lifecycle] validateAndUpdatePdf data:', JSON.stringify(data, null, 2));

  // PDF 필드 확인
  if (!data.PDF) {
    console.log('[Lifecycle] No PDF data in payload');
    return;
  }

  try {
    // 1. 파일 ID 추출
    let fileId;

    // Strapi 5에서 Media 필드는 보통 { connect: [ { id: '...' } ] } 또는 직접 ID 형태로 옴
    if (typeof data.PDF === 'object' && data.PDF !== null) {
      if (data.PDF.id) {
        fileId = data.PDF.id;
      } else if (data.PDF.documentId) {
        fileId = data.PDF.documentId;
      } else if (Array.isArray(data.PDF.connect) && data.PDF.connect.length > 0) {
        const connectObj = data.PDF.connect[0];
        fileId = typeof connectObj === 'object' ? (connectObj.id || connectObj.documentId) : connectObj;
      }
    } else {
      fileId = data.PDF;
    }

    console.log('[Lifecycle] Extracted fileId:', fileId);

    if (!fileId) {
      console.log('[Lifecycle] Could not extract fileId');
      return;
    }

    // 2. 파일 정보 조회
    const file = await strapi.db.query('plugin::upload.file').findOne({
      where: {
        $or: [
          { id: fileId },
          { documentId: fileId }
        ]
      }
    });

    console.log('[Lifecycle] Found file record:', JSON.stringify(file, null, 2));

    if (file) {
      // 3. PDF 유효성 검사
      const isPdf = file.ext?.toLowerCase() === '.pdf' || file.mime === 'application/pdf';

      if (!isPdf) {
        console.log('[Lifecycle] Not a PDF file. Blocking upload.');
        throw new ApplicationError('pdf 파일만 업로드 가능합니다.');
      }

      // 4. 파일명 주입
      if (file.name) {
        const nameWithoutExt = path.parse(file.name).name;
        // Strapi 5 Lifecycle에서는 data를 직접 수정하면 DB에 반영됩니다.
        data.PDF_FILE_NAME = nameWithoutExt;
        console.log(`[Lifecycle] SUCCESS: PDF_FILE_NAME set to "${nameWithoutExt}"`);
      }
    } else {
      console.log('[Lifecycle] File record not found in DB for ID:', fileId);
    }
  } catch (error) {
    if (error instanceof ApplicationError) {
      throw error;
    }
    console.error('[Lifecycle] Error in validateAndUpdatePdf:', error);
  }
}
