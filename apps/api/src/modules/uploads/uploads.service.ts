import { Injectable } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuid } from 'uuid';

@Injectable()
export class UploadsService {
  private supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  async getScreenshotUploadUrl(userId: string) {
    const key = `${userId}/${uuid()}.jpg`;

    const { data, error } = await this.supabase.storage
      .from('screenshots')
      .createSignedUploadUrl(key);

    if (error) throw new Error(error.message);

    return {
      uploadUrl: data.signedUrl,
      key,
    };
  }
}
