// SPDX-License-Identifier: Apache-2.0
let input = '';

process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => {
  input += chunk;
});
process.stdin.on('end', () => {
  const redacted = input
    .replace(/(PASSWORD|SECRET|TOKEN|KEY|DATABASE_URL)([^:\n]*):\s*.+/gi, '$1$2: "[redacted]"')
    .replace(/(POSTGRES_PASSWORD|MINIO_ROOT_PASSWORD)=.+/gi, '$1=[redacted]');

  process.stdout.write(redacted);
});
