import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import { fileTypeFromBuffer } from 'file-type';

async function extractResumeText(buffer) {
  const type = await fileTypeFromBuffer(buffer);
  if (!type) throw new Error('Unknown file type');

  if (type.mime === 'application/pdf') {
    const data = await pdfParse(buffer);
    return clean(data.text);
  }

  if (type.mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    const result = await mammoth.extractRawText({ buffer });
    return clean(result.value);
  }

  if (type.mime === 'text/plain') {
    return clean(buffer.toString());
  }

  throw new Error('Unsupported format');
}

function clean(text) {
  return text
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 12000);
}

export default extractResumeText;