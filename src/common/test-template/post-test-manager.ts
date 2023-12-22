import {
  UserTestDTO,
  UserTestManager,
} from '@Helper/test-utils/users-test-utils';
import { HttpStatus, INestApplication } from '@nestjs/common';
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

export type ConfigureRequestToolsType = {
  app: INestApplication;
  userManager: UserTestManager;
};

export type ConfigureManagerType = {
  name: string;
};

export type GenerateUrlParametersType<U> = {
  actor: UserTestDTO;
  originalData: any;
  extraData: any;
  testDataUrl: U;
};

export type GenerateUrlType<U> = (
  config: GenerateUrlParametersType<U>,
) => string;

export type ProcessDataForRequestParametersType<U> = {
  actor: UserTestDTO;
  originalData: any;
  extraData: any;
  testDataUrl: U;
};

export type ProcessDataForRequestType<U> = (
  config: ProcessDataForRequestParametersType<U>,
) => any;

export type CheckForRequestParametersType = {
  originalData: any;
  responseCreated: any;
  expect: ExpectStatic;
};

export type CheckForRequestType = (
  config: CheckForRequestParametersType,
) => void;

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
  checkResultSucceed?: CheckForRequestType;
  token?: boolean;
};

export type PerformRequestType<U> = (
  config: PerformRequestParametersType<U>,
  beforeResult: BeforeRequestManagerReturnType,
  saveIdCreated: { response: CreateDataReturnType | undefined },
  expect: ExpectStatic,
) => Promise<void>;

export type DestructionResultParametersType = {
  result: CreateDataReturnType | undefined;
};

export type DestructionResultType = (
  config: DestructionResultParametersType,
) => Promise<void>;

export type ConfigurePostRequestType<U> = {
  prepareRequest?: PrepareRequestType;
  generateUrl: GenerateUrlType<U>;
  processDataForRequest?: ProcessDataForRequestType<U>;
  checkForRequest?: CheckForRequestType;
  destructionResult: DestructionResultType;
};

export type TestConfigWithIdType<U> = { id: string } & TestConfigType<U>;

export type TestResultBeforeType<U> = {
  id: string;
  beforeResult: BeforeRequestManagerReturnType;
  configRequest: PerformRequestParametersType<U>;
};

export type TestResultTestType = {
  id: string;
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
  resultTest: TestResultTestType;
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
  dataToSend: any;
  actor: UserTestDTO;
};

export type BeforeRequestManagerType<U> = (
  config: PerformRequestParametersType<U>,
) => Promise<BeforeRequestManagerReturnType>;

// -------------------------------------------------------------------------------- //
// --------------------------------------CLASS------------------------------------- //
// -------------------------------------------------------------------------------- //

export abstract class PostTestAbstract<P, U = undefined> {
  protected tools: ConfigureRequestToolsType;
  protected params: P;
  protected configure: ConfigureManagerType;
  abstract nameSuiteOfTest: string;
  protected performRequest: PerformRequestType<U>;

  private listTestConfig: TestConfigWithIdType<U>[] = [];
  private listTestResultBefore: TestResultBeforeType<U>[] = [];
  private listTestResultTest: TestResultTestType[] = [];

  constructor(
    tools: ConfigureRequestToolsType,
    configure: ConfigureManagerType,
    performRequest: PerformRequestType<U>,
    params: P,
  ) {
    this.tools = tools;
    this.configure = configure;
    this.params = params;
    this.performRequest = performRequest;
  }

  protected test(config: TestConfigType<U>) {
    const id = uuidv4();
    this.listTestConfig.push({
      ...config,
      id: id,
    });

    test.concurrent(config.name, async ({ expect }) => {
      const find = this.listTestResultBefore.find((result) => result.id === id);
      const saveResponseBody = { response: undefined };
      try {
        await this.performRequest(
          find.configRequest,
          find.beforeResult,
          saveResponseBody,
          expect,
        );
      } finally {
        this.listTestResultTest.push({
          resultData: saveResponseBody.response,
          id: id,
        });
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
        const finalResult = await before(result);
        this.listTestResultBefore.push({
          beforeResult: finalResult,
          configRequest: result,
          id: config.id,
        });
      }
    });
    afterAll(async (context) => {
      for (const config of this.listTestConfig) {
        const resultTest = this.listTestResultTest.find(
          (result) => result.id === config.id,
        );
        if (config.afterTest) {
          await config.afterTest({
            configTest: config,
            resultBefore: this.listTestResultBefore.find(
              (result) => result.id === config.id,
            ),
            resultTest: resultTest,
          });
        }
        await destructionResult({ result: resultTest.resultData });
      }
    });
  }

  abstract execute(): void;
}

export class PostTestManager<U = undefined> {
  private tools: ConfigureRequestToolsType;
  private configure: ConfigureManagerType;
  private configurePostRequest: ConfigurePostRequestType<U>;

  constructor(
    tools: ConfigureRequestToolsType,
    configure: ConfigureManagerType,
    configurePostRequest: ConfigurePostRequestType<U>,
  ) {
    this.tools = tools;
    this.configure = configure;
    this.configurePostRequest = configurePostRequest;
  }

  protected async before(
    config: PerformRequestParametersType<U>,
  ): Promise<BeforeRequestManagerReturnType> {
    if (!config.checkResultSucceed) {
      config.checkResultSucceed = () => {};
    }
    if (!config.originalData) {
      config.originalData = {};
    }
    if (config.token === undefined || config.token === null) {
      config.token = true;
    }

    const actor = this.tools.userManager.findUserByKey(config.actorKey);

    let extraData = {};
    if (this.configurePostRequest.prepareRequest) {
      extraData = await this.configurePostRequest.prepareRequest({
        actor: actor,
      });
    }

    let dataToSend = config.originalData;
    if (this.configurePostRequest.processDataForRequest) {
      dataToSend = this.configurePostRequest.processDataForRequest({
        actor: actor,
        originalData: config.originalData,
        extraData: extraData,
        testDataUrl: config.testDataUrl,
      });
    }

    const url = this.configurePostRequest.generateUrl({
      actor: actor,
      extraData: extraData,
      originalData: dataToSend,
      testDataUrl: config.testDataUrl,
    });

    return { url, dataToSend, actor };
  }

  protected async performRequest(
    config: PerformRequestParametersType<U>,
    beforeResult: BeforeRequestManagerReturnType,
    saveIdCreated: { response: CreateDataReturnType | undefined },
    expect: ExpectStatic,
  ) {
    let response;

    if (config.token) {
      response = await request(this.tools.app.getHttpServer())
        .post(beforeResult.url)
        .set('Authorization', `Bearer ${beforeResult.actor.token}`)
        .send(beforeResult.dataToSend);
    } else {
      response = await request(this.tools.app.getHttpServer())
        .post(beforeResult.url)
        .send(beforeResult.dataToSend);
    }

    if (
      response.status === HttpStatus.CREATED ||
      response.status === HttpStatus.OK
    ) {
      Object.assign(saveIdCreated, response);
    }

    if (config.shouldSucceed) {
      expect(response.status).toBe(HttpStatus.CREATED);
      config.checkResultSucceed({
        originalData: config.originalData,
        responseCreated: response.body,
        expect: expect,
      });

      if (this.configurePostRequest.checkForRequest)
        this.configurePostRequest.checkForRequest({
          originalData: config.originalData,
          responseCreated: response.body,
          expect: expect,
        });
    } else {
      expect(response.status).toBe(config.errorCode);
    }
  }

  executeTest<P, T extends PostTestAbstract<P, U>>(
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
        this.configurePostRequest.destructionResult.bind(this),
      );
    });
  }
}
