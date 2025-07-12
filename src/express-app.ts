import compression from "compression";
import cors from "cors";
import express, { Express, Response } from "express";
import helmet from "helmet";
import path from "path";
import rateLimit from "express-rate-limit";
import morgan from "morgan";
import routerv1 from "./routes/v1/router";
import { errorHandler } from "./shared/middlewares/error-handler.middleware";
import { APP_SETTINGS } from "./shared/app-settings";
import { swaggerSpec } from "./shared/swagger";
import swaggerUi from "swagger-ui-express";

const app: Express = express();

app.set('trust proxy', 1);

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginEmbedderPolicy: false,
}));

const corsOptions = {
  origin: APP_SETTINGS.IS_PRODUCTION 
    ? APP_SETTINGS.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3004']
    : true,
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'Cache-Control',
    'Connection',
    'Accept',
    'Accept-Encoding',
    'X-Requested-With'
  ],
  exposedHeaders: [
    'Cache-Control',
    'Connection',
    'Content-Type',
    'Date',
    'Etag',
    'Expires',
    'Keep-Alive',
    'Last-Modified',
    'Server',
    'Transfer-Encoding'
  ]
};

app.use(cors(corsOptions));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: APP_SETTINGS.IS_PRODUCTION ? 100 : 1000, 
  message: {
    error: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // 5 login attempts per 15 minutes
  message: {
    error: 'Too many authentication attempts, please try again later.',
  },
});

app.use(compression({
  filter: (req, res) => {
    // Don't compress if explicitly requested
    if (req.headers['x-no-compression']) {
      return false;
    }
    
    // Don't compress streaming endpoints
    if (req.path.includes('/stream') || req.path.includes('/ai-sdk')) {
      return false;
    }
    
    // Don't compress if content-type is text/event-stream or text/plain (for streaming)
    const contentType = res.get('content-type');
    if (contentType && (contentType.includes('text/event-stream') || contentType.includes('text/plain'))) {
      return false;
    }
    
    return compression.filter(req, res);
  },
  level: 6,
  threshold: 1024,
}));

app.use(express.json({ 
  limit: '10mb',
  strict: true,
}));

app.use(express.urlencoded({ 
  extended: true, 
  limit: '10mb',
}));

if (APP_SETTINGS.IS_PRODUCTION) {
  app.use(morgan('combined'));
} else {
  app.use(morgan('dev'));
}

app.use("/static", express.static(path.join(process.cwd(), "mx-images"), {
  maxAge: APP_SETTINGS.IS_PRODUCTION ? '1d' : '0',
  etag: true,
  lastModified: true,
}));

if (APP_SETTINGS.IS_DEVELOPMENT) {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
}


app.use((req, res, next) => {
  (req as any).user = {
    id: 1,
    name: 'John Doe',
    email: 'john.doe@example.com',
  };
  next();
});


app.use('/api/v1/users/login', authLimiter);
app.use('/api/v1/users/register', authLimiter);

app.use("/api/v1", routerv1);

app.use('*', (_, res: Response) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    statusCode: 404,
  });
});

app.use(errorHandler);

export default app;
