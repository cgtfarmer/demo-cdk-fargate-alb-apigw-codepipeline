import express, { Request, Response } from 'express';
import userRouter from './router/user-router';
import DependencyGraph from './config/dependency-graph';
import requestLogger from './middleware/request-logger';

const app = express();

const startServer = async () => {
  await DependencyGraph.getInstance();

  app.use(express.json());

  app.use(requestLogger);

  app.use('/users', userRouter);

  app.get('/health', async (request: Request, response: Response) => {
    response.json({ msg: 'healthy' });
  });

  app.listen(80, function() {
    console.log('App listening on port 80');
  });
};

startServer();
