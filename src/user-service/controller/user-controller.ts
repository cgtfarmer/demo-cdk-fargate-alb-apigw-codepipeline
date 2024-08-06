import { Request, Response } from 'express';
import User from '../dto/user';

export default class UserController {

  private readonly headers: Record<string, string>;

  constructor() {
    this.headers = {
      'Content-Type': 'application/json',
    };
  }

  public async index(request: Request, response: Response) {
    console.log('[UserController#index]');

    const body: User[] = [
      { id: 1, firstName: 'John', lastName: 'Doe', age: 32, weight: 185.3, smoker: false },
      { id: 2, firstName: 'Jane', lastName: 'Doe', age: 31, weight: 142.7, smoker: false },
    ];

    response.status(200);
    response.set(this.headers);
    response.json(body);
  }

  public async create(request: Request, response: Response) {
    console.log('[UserController#create]');

    const requestBody: User = request.body;

    console.log(`[UserController#create] body: ${requestBody}`);

    const body: User = {
      id: 1, firstName: 'John', lastName: 'Doe', age: 32, weight: 185.3, smoker: false
    };

    response.status(201);
    response.set(this.headers);
    response.json(body);
  }

  public async show(request: Request, response: Response) {
    console.log('[UserController#show]');

    const id = request.params.id;

    console.log(`[UserController#show] ${id}`);

    const body: User = {
      id: 1, firstName: 'John', lastName: 'Doe', age: 32, weight: 185.3, smoker: false
    };

    response.status(200);
    response.set(this.headers);
    response.json(body);
  }

  public async update(request: Request, response: Response) {
    console.log('[UserController#update]');

    const id = request.params.id;
    const requestBody: User = request.body;

    console.log(`[UserController#update] id:${id}`);
    console.log(`[UserController#update] body:${requestBody}`);

    requestBody.id = Number.parseInt(id);

    const body: User = {
      id: 1, firstName: 'John', lastName: 'Doe', age: 32, weight: 185.3, smoker: false
    };

    response.status(200);
    response.set(this.headers);
    response.json(body);
  }

  public async destroy(request: Request, response: Response) {
    console.log('[UserController#destroy]');

    const id = request.params.id;

    console.log(`[UserController#destroy] ${id}`);

    const body = {
      message: `ID: ${id} deleted successfully`
    };

    response.status(200);
    response.set(this.headers);
    response.json(body);
  }
}
