export const config = {
  port: process.env.PORT || 3000,
  apiKeys: new Set(process.env.API_KEYS || [`CQd4OA+*-)Wq+iGB5UGNbc%P.J)QbaHJ0r@u6i@uE4e&2aFG#kr9^*FogwSU[Ah,).9z%aLtEGjTr:r+T^):EZHZe?@qKYdN'(RMW_^7e-zdm<H>YHjs[R9i[)w'fW'[mM<V8I%M=WkzeBS)3;a3.rvyy}sq9pgr]j#2zM;FjGNBV-|SA,v92,X@'i3Q;DDg8&/r7,!,3FI7~Q:zMH_#;j?84Ymi%Pb:yTSM6-Ij)nO*v8LRJn@K<NjW:_SGfzX-&l5wH>KLGWb.3jDtDBI<tvJ2m9wj8cCwD]Y)3`]),
  uploadDir: process.env.UPLOAD_DIR || './uploads',
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '50') * 1024 * 1024,
  allowedTypes: process.env.ALLOWED_TYPES?.split(',') || [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'video/mp4', 'video/webm',
  ],
  webp: {
    quality: parseInt(process.env.WEBP_QUALITY || '80'),
    effort: parseInt(process.env.WEBP_EFFORT || '4')
  }
}