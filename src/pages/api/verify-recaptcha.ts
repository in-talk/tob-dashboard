import { NextApiRequest, NextApiResponse } from 'next';

interface RecaptchaResponse {
  success: boolean;
  challenge_ts?: string;
  hostname?: string;
  'error-codes'?: string[];
  score?: number;
  action?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      message: 'Method not allowed' 
    });
  }

  const { token } = req.body;

  // Validate token presence
  if (!token) {
    return res.status(400).json({ 
      success: false, 
      message: 'reCAPTCHA token is required' 
    });
  }

  // Validate token format (basic check)
  if (typeof token !== 'string' || token.length < 20) {
    return res.status(400).json({ 
      success: false, 
      message: 'Invalid reCAPTCHA token format' 
    });
  }

  // Check for secret key
  const secretKey = process.env.RECAPTCHA_SECRET_KEY;
  if (!secretKey) {
    console.error('RECAPTCHA_SECRET_KEY is not configured');
    return res.status(500).json({ 
      success: false, 
      message: 'reCAPTCHA is not properly configured' 
    });
  }

  try {
    // Get client IP for additional verification
    const clientIp = 
      req.headers['x-forwarded-for'] || 
      req.headers['x-real-ip'] || 
      req.socket.remoteAddress || 
      '';

    // Prepare request body
    const params = new URLSearchParams({
      secret: secretKey,
      response: token,
      ...(clientIp && { remoteip: Array.isArray(clientIp) ? clientIp[0] : clientIp.split(',')[0].trim() })
    });

    // Verify with Google
    const response = await fetch(
      'https://www.google.com/recaptcha/api/siteverify',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      }
    );

    if (!response.ok) {
      throw new Error(`reCAPTCHA API returned status ${response.status}`);
    }

    const data: RecaptchaResponse = await response.json();

    // Log for debugging (remove in production or use proper logging)
    if (!data.success) {
      console.warn('reCAPTCHA verification failed:', {
        errors: data['error-codes'],
        timestamp: new Date().toISOString(),
      });
    }

    if (data.success) {
      return res.status(200).json({ 
        success: true,
        timestamp: data.challenge_ts 
      });
    } else {
      // Handle specific error codes
      const errorCodes = data['error-codes'] || [];
      let message = 'reCAPTCHA verification failed';

      if (errorCodes.includes('timeout-or-duplicate')) {
        message = 'reCAPTCHA token has expired or was already used';
      } else if (errorCodes.includes('invalid-input-response')) {
        message = 'Invalid reCAPTCHA token';
      } else if (errorCodes.includes('missing-input-response')) {
        message = 'reCAPTCHA token is missing';
      }

      return res.status(400).json({ 
        success: false, 
        message,
        errorCodes 
      });
    }
  } catch (error) {
    console.error('reCAPTCHA verification error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to verify reCAPTCHA. Please try again.' 
    });
  }
}