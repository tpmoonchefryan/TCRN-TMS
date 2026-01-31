import { ConsoleLogger, Injectable } from '@nestjs/common';

@Injectable()
export class ApiLogger extends ConsoleLogger {
  log(message: unknown, context?: string) {
    // Filter out noisy contexts
    const ignoredContexts = [
      'RouterExplorer',
      'RoutesResolver',
      'InstanceLoader'
    ];

    if (context && ignoredContexts.includes(context)) {
      return;
    }
    
    super.log(message, context);
  }
}
