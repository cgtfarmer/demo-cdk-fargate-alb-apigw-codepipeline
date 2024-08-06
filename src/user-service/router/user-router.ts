import { Router, Request, Response } from 'express';
import DependencyGraph from '../config/dependency-graph';
import UserController from '../controller/user-controller';

const router = Router();

let userController: UserController;

DependencyGraph.getInstance()
  .then((graph) => {
    console.log('Dependency graph initialized')
    userController = graph.userController;
  });

router.get('/', async (request: Request, response: Response) => {
  await userController.index(request, response);
});

router.get('/:id', async (request: Request, response: Response) => {
  await userController.show(request, response);
});

router.post('/', async (request: Request, response: Response) => {
  await userController.create(request, response);
});

router.put('/:id', async (request: Request, response: Response) => {
  await userController.update(request, response);
});

router.delete('/:id', async (request: Request, response: Response) => {
  await userController.destroy(request, response);
});

export default router;
