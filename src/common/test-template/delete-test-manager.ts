import {
  ConfigureManagerType,
  ConfigureRequestToolsType,
} from '@Helper/test-template/post-test-manager';
import { UserTestDTO } from '@Helper/test-utils/users-test-utils';
import { HttpStatus } from '@nestjs/common';
import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';
import { ExpectStatic, afterAll, beforeAll, describe, test } from 'vitest';

// -------------------------------------------------------------------------------- //
// --------------------------------------TYPE-------------------------------------- //
// -------------------------------------------------------------------------------- //

export type CreateDataReturnType = {
  id: string;
  [key: string]: any;
};

export type CreateDataParametersType<U> = {
  actor: UserTestDTO;
  originalData: any;
  extraData: any;
  testDataUrl: U;
};

export type CreateDataType<U> = (
  config: CreateDataParametersType<U>,
) => Promise<CreateDataReturnType>;

export type GenerateUrlParametersType<U> = {
  actor: UserTestDTO;
  responseCreated: any;
  extraData: any;
  testDataUrl: U;
};

export type GenerateUrlType<U> = (
  config: GenerateUrlParametersType<U>,
) => string;

export type PrepareRequestParametersType = {
  actor: UserTestDTO;
};

export type PrepareRequestType = (
  config: PrepareRequestParametersType,
) => Promise<any>;

export type PerformRequestParametersType<U> = {
  testDataUrl: U;
  actorKey: string;
  shouldSucceed: boolean;
  errorCode?: HttpStatus;
  originalData?: any;
  token?: boolean;
  startCreatedCustom?: CreateDataType<U>;
};

export type PerformRequestType<U> = (
  config: PerformRequestParametersType<U>,
  beforeResult: BeforeRequestManagerReturnType,
  expect: ExpectStatic,
) => Promise<boolean>;

export type DestructionResultParametersType = {
  result: CreateDataReturnType;
  success: boolean;
};

export type DestructionResultType = (
  config: DestructionResultParametersType,
) => Promise<void>;

export type ConfigureDeleteRequestType<U> = {
  prepareRequest?: PrepareRequestType;
  generateUrl: GenerateUrlType<U>;
  createData: CreateDataType<U>;
  destructionResult: DestructionResultType;
};

export type TestConfigWithIdType<U> = { id: string } & TestConfigType<U>;

export type TestResultBeforeType<U> = {
  id: string;
  beforeResult: BeforeRequestManagerReturnType;
  configRequest: PerformRequestParametersType<U>;
  resultData: CreateDataReturnType | undefined;
};

export type BeforeTestParametersType<U> = {
  configTest: TestConfigWithIdType<U>;
};

export type BeforeTestType<U> = (
  config: BeforeTestParametersType<U>,
) => Promise<PerformRequestParametersType<U>>;

export type AfterTestParametersType<U> = {
  configTest: TestConfigWithIdType<U>;
  resultBefore: TestResultBeforeType<U>;
};

export type AfterTestType<U> = (
  config: AfterTestParametersType<U>,
) => Promise<void>;

export type TestConfigType<U> = {
  name: string;
  beforeTest: BeforeTestType<U>;
  afterTest?: AfterTestType<U>;
};

export type BeforeRequestManagerReturnType = {
  url: string;
  responseCreated: any;
  actor: UserTestDTO;
  success: boolean;
};

export type BeforeRequestManagerType<U> = (
  config: PerformRequestParametersType<U>,
  saveIdCreated: { response: CreateDataReturnType | undefined },
) => Promise<BeforeRequestManagerReturnType>;

// -------------------------------------------------------------------------------- //
// --------------------------------------CLASS------------------------------------- //
// -------------------------------------------------------------------------------- //

export abstract class DeleteTestAbstract<P, U = undefined> {
  protected tools: ConfigureRequestToolsType;
  protected params: P;
  protected configure: ConfigureManagerType;
  protected performRequest: PerformRequestType<U>;
  abstract nameSuiteOfTest: string;

  private listTestConfig: TestConfigWithIdType<U>[] = [];
  private listTestResultBefore: TestResultBeforeType<U>[] = [];

  constructor(
    tools: ConfigureRequestToolsType,
    configure: ConfigureManagerType,
    performRequest: PerformRequestType<U>,
    params: P,
  ) {
    this.tools = tools;
    this.configure = configure;
    this.performRequest = performRequest;
    this.params = params;
  }

  protected test(config: TestConfigType<U>) {
    const id = uuidv4();
    this.listTestConfig.push({
      ...config,
      id: id,
    });

    test.concurrent(config.name, async ({ expect }) => {
      const find = this.listTestResultBefore.find((result) => result.id === id);

      try {
        await this.performRequest(
          find.configRequest,
          find.beforeResult,
          expect,
        );
      } finally {
        if (find.beforeResult.success) {
          find.resultData = undefined;
        }
      }
    });
  }

  setUp(
    before: BeforeRequestManagerType<U>,
    destructionResult: DestructionResultType,
  ) {
    beforeAll(async (context) => {
      for (const config of this.listTestConfig) {
        const result = await config.beforeTest({ configTest: config });
        const saveResponseBody = { response: undefined };

        const finalResult = await before(result, saveResponseBody);
        this.listTestResultBefore.push({
          beforeResult: finalResult,
          configRequest: result,
          id: config.id,
          resultData: saveResponseBody.response,
        });
      }
    });
    afterAll(async (context) => {
      for (const config of this.listTestConfig) {
        const resultBefore = this.listTestResultBefore.find(
          (result) => result.id === config.id,
        );
        if (config.afterTest) {
          await config.afterTest({
            configTest: config,
            resultBefore: resultBefore,
          });
        }
        await destructionResult({
          result: resultBefore.resultData,
          success: resultBefore.beforeResult.success,
        });
      }
    });
  }

  abstract execute(): void;
}

export class DeleteTestManager<U = undefined> {
  private tools: ConfigureRequestToolsType;
  private configure: ConfigureManagerType;
  private configureDeleteRequest: ConfigureDeleteRequestType<U>;

  constructor(
    tools: ConfigureRequestToolsType,
    configure: ConfigureManagerType,
    configureDeleteRequest: ConfigureDeleteRequestType<U>,
  ) {
    this.tools = tools;
    this.configure = configure;
    this.configureDeleteRequest = configureDeleteRequest;
  }

  protected async before(
    config: PerformRequestParametersType<U>,
    saveIdCreated: CreateDataReturnType,
  ): Promise<BeforeRequestManagerReturnType> {
    if (!config.originalData) {
      config.originalData = {};
    }
    if (config.token === undefined || config.token === null) {
      config.token = true;
    }

    const actor = this.tools.userManager.findUserByKey(config.actorKey);

    let extraData = {};
    if (this.configureDeleteRequest.prepareRequest) {
      extraData = await this.configureDeleteRequest.prepareRequest({
        actor: actor,
      });
    }

    let created;
    if (!config.startCreatedCustom) {
      created = await this.configureDeleteRequest.createData({
        actor: actor,
        originalData: config.originalData,
        extraData: extraData,
        testDataUrl: config.testDataUrl,
      });
      Object.assign(saveIdCreated, created);
    } else {
      created = await config.startCreatedCustom({
        actor: actor,
        originalData: config.originalData,
        extraData: extraData,
        testDataUrl: config.testDataUrl,
      });
    }

    const url = this.configureDeleteRequest.generateUrl({
      actor: actor,
      responseCreated: created,
      extraData: extraData,
      testDataUrl: config.testDataUrl,
    });

    return { url, actor, responseCreated: created, success: true };
  }

  protected async performRequest(
    config: PerformRequestParametersType<U>,
    beforeResult: BeforeRequestManagerReturnType,
    expect: ExpectStatic,
  ) {
    let response;

    if (config.token) {
      response = await request(this.tools.app.getHttpServer())
        .delete(beforeResult.url)
        .set('Authorization', `Bearer ${beforeResult.actor.token}`);
    } else {
      response = await request(this.tools.app.getHttpServer()).delete(
        beforeResult.url,
      );
    }

    if (response.status !== HttpStatus.OK) {
      beforeResult.success = false;
    } else {
      beforeResult.success = true;
    }

    if (config.shouldSucceed) {
      expect(response.status).toBe(HttpStatus.OK);
    } else {
      expect(response.status).toBe(config.errorCode);
    }
  }

  executeTest<P, T extends DeleteTestAbstract<P, U>>(
    testType: new (
      tools: ConfigureRequestToolsType,
      configure: ConfigureManagerType,
      performRequest: PerformRequestType<U>,
      params: P,
    ) => T,
    params: P,
  ) {
    const testInstance = new testType(
      this.tools,
      this.configure,
      this.performRequest.bind(this),
      params,
    );
    describe.concurrent(testInstance.nameSuiteOfTest, () => {
      testInstance.execute();
      testInstance.setUp(
        this.before.bind(this),
        this.configureDeleteRequest.destructionResult.bind(this),
      );
    });
  }
}
