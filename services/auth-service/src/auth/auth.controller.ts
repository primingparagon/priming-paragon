// services/auth-service/src/auth/auth.controller.ts
import { Request, Response, Router } from 'express';
import { AuthService } from './auth.service';

interface AuthDTO {
  email: string;
  password: string;
}

export class AuthController {
  constructor(private authService: AuthService) {}

  async register(req: Request, res: Response) {
    const { email, password } = req.body as AuthDTO;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password required' });
    }

    try {
      const user = await this.authService.register(email, password);
      const token = this.authService.generateToken(user);
      res.status(201).json({ user, token });
    } catch (error: any) { // Explicitly type error as any for accessing error.code
      // Check for specific Postgres unique constraint violation error code '23505'
      if (error && error.code === '23505') {
        return res.status(409).json({ message: 'User with that email already exists' });
      }
      
      // Log the error for internal debugging
      console.error('Registration error:', error);
      // Fallback to a generic 500 error for unexpected issues
      res.status(500).json({ message: 'Internal server error during registration' });
    }
  }

  async login(req: Request, res: Response) {
    const { email, password } = req.body as AuthDTO;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password required' });
    }

    const user = await this.authService.validateUser(email, password);
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = this.authService.generateToken(user);
    res.status(200).json({ user, token });
  }

  getRouter(): Router {
    const router = Router();
    router.post('/register', this.register.bind(this));
    router.post('/login', this.login.bind(this));
    return router;
  }
}
