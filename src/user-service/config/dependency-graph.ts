import EnvironmentAccessor from '../accessor/environment-accessor';
import UserController from '../controller/user-controller';

export default class DependencyGraph {

  private static singleton: DependencyGraph;

  public static async getInstance() {
    if (DependencyGraph.singleton) return DependencyGraph.singleton;

    const environmentAccessor = new EnvironmentAccessor();

    const envVar = environmentAccessor.get('TEST_VALUE');

    console.log(`Environment Variable: ${envVar}`);

    const userController = new UserController();

    DependencyGraph.singleton = new DependencyGraph(userController);

    return DependencyGraph.singleton;
  }

  constructor(public readonly userController: UserController) {
  }
}
