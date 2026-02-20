import sharp from 'sharp';
import axios from 'axios';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

/**
 * Baixa uma imagem, redimensiona para 1000x1000 (quadrado) com fundo branco
 * e salva temporariamente em public/cache/ (para ser servida pelo Next.js)
 */
export async function processProductImage(imageUrl: string): Promise<string> {
    const cacheDir = path.resolve(process.cwd(), 'public/image_cache');
    if (!fs.existsSync(cacheDir)) {
        fs.mkdirSync(cacheDir, { recursive: true });
    }

    const hash = crypto.createHash('md5').update(imageUrl).digest('hex');
    const filename = `${hash}.jpg`;
    const outputPath = path.join(cacheDir, filename);

    if (fs.existsSync(outputPath)) {
        return `/image_cache/${filename}`;
    }

    try {
        const response = await axios({
            url: imageUrl,
            responseType: 'arraybuffer'
        });

        const buffer = Buffer.from(response.data);

        await sharp(buffer)
            .resize(1000, 1000, {
                fit: 'contain',
                background: { r: 255, g: 255, b: 255, alpha: 1 }
            })
            .flatten({ background: { r: 255, g: 255, b: 255 } })
            .jpeg({ quality: 90 })
            .toFile(outputPath);

        return `/image_cache/${filename}`;

    } catch (error) {
        console.error('[IMAGE-PROCESSOR ERROR]', error);
        return imageUrl;
    }
}
