import { Request, Response } from 'express';
import axios from 'axios';
import FormData from 'form-data';
import { ENV } from '../config/env';

export const uploadImage = async (req: Request, res: Response): Promise<void> => {
  try {
    const file = req.file;

    if (!file) {
      res.status(400).json({ success: false, message: 'No image file uploaded.' });
      return;
    }

    if (!ENV.IMGBB_API_KEY) {
      res.status(500).json({
        success: false,
        message: 'IMGBB_API_KEY is not configured on the server.'
      });
      return;
    }

    const formData = new FormData();
    formData.append('image', file.buffer.toString('base64'));

    const response = await axios.post(
      `https://api.imgbb.com/1/upload?key=${ENV.IMGBB_API_KEY}`,
      formData,
      {
        headers: formData.getHeaders()
      }
    );

    if (response.data && response.data.data && response.data.data.url) {
      res.status(200).json({
        success: true,
        message: 'Image uploaded successfully.',
        url: response.data.data.url,
        display_url: response.data.data.display_url
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: 'Unexpected response from ImgBB API.'
    });
  } catch (error: any) {
    console.error('[UploadController.uploadImage] Error:', error?.response?.data || error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to upload image to ImgBB.',
      error: error?.response?.data?.error?.message || error.message
    });
  }
};
