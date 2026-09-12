import type { Buyer, Product, Variant } from '../shared/types.js';
import { generateCopy } from './engine.js';
import { generateImage, imageGenerationEnabled, imageModel, ImageGenerationError } from './images.js';

export const needsGeneration = (variant: Variant, imagesEnabled: boolean) => variant.status !== 'complete' || (imagesEnabled && !variant.imageUrl);

/** Copy and image have separate checkpoints so image retries preserve saved edits. */
export async function generateVariant(product: Product, buyer: Buyer, variant: Variant, projectId: string, imageDirectory: string, persist: () => Promise<unknown>, dependencies = { generateCopy, generateImage, imageGenerationEnabled }) {
  if (variant.status !== 'complete') {
    variant.status = 'running'; delete variant.error; await persist();
    try {
      const copy = await dependencies.generateCopy(product, buyer);
      Object.assign(variant, { title: copy.title, description: copy.description, originalTitle: copy.title, originalDescription: copy.description, provider: copy.provider, status: 'complete' });
    } catch {
      variant.status = 'failed'; variant.error = '這個版本的文案未完成，請重試。';
      await persist(); return;
    }
    await persist();
  }
  if (variant.imageUrl) return;
  if (!dependencies.imageGenerationEnabled()) {
    variant.imageStatus = 'disabled'; delete variant.imageError; await persist(); return;
  }
  variant.imageStatus = 'running'; variant.imageModel = imageModel(); delete variant.imageError; await persist();
  // Capture the copy at request time; editing while an image is running is allowed.
  const snapshot = { ...variant };
  try {
    Object.assign(variant, await dependencies.generateImage(product, buyer, snapshot, projectId, imageDirectory));
    variant.imageStatus = 'complete';
  } catch (error) {
    variant.imageStatus = 'failed';
    variant.imageError = error instanceof ImageGenerationError ? error.message : '圖片生成或儲存未完成，請重試；已完成的文案會保留。';
  }
  await persist();
}
