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
  updateData: any;
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
  updateData: any;
  testDataUrl: U;
};

export type GenerateUrlType<U> = (
  config: GenerateUrlParametersType<U>,
) => string;

export type ProcessDataForRequestParametersType<U> = {
  actor: UserTestDTO;
  originalData: any;
  updateData: any;
  extraData: any;
  responseCreated: any;
  testDataUrl: U;
};

export type ProcessDataForRequestType<U> = (
  config: ProcessDataForRequestParametersType<U>,
) => any;

export type CheckForRequestParametersType = {
  originalData: any;
  updateData: any;
  responseCreated: any;
  responseUpdated: any;
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
  updateData?: any;
  checkResultSucceed?: CheckForRequestType;
  token?: boolean;
  startCreatedCustom?: CreateDataType<U>;
};

export type PerformRequestType<U> = (
  config: PerformRequestParametersType<U>,
  beforeResult: BeforeRequestManagerReturnType,
  expect: ExpectStatic,
) => Promise<void>;

export type DestructionResultParametersType = {
  result: CreateDataReturnType | undefined;
};

export type DestructionResultType = (
  config: DestructionResultParametersType,
) => Promise<void>;

export type ConfigurePutRequestType<U> = {
  prepareRequest?: PrepareRequestType;
  generateUrl: GenerateUrlType<U>;
  createData: CreateDataType<U>;
  processDataForRequest?: ProcessDataForRequestType<U>;
  checkForRequest?: CheckForRequestType;
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
  dataToSend: any;
  actor: UserTestDTO;
};

export type BeforeRequestManagerType<U> = (
  config: PerformRequestParametersType<U>,
  saveIdCreated: { response: CreateDataReturnType | undefined },
) => Promise<BeforeRequestManagerReturnType>;

// -------------------------------------------------------------------------------- //
// --------------------------------------CLASS------------------------------------- //
// -------------------------------------------------------------------------------- //

export abstract class PutTestAbstract<P, U = undefined> {
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
      await this.performRequest(find.configRequest, find.beforeResult, expect);
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
        await destructionResult({ result: resultBefore.resultData });
      }
    });
  }

  abstract execute(): void;
}

export class PutTestManager<U = undefined> {
  private tools: ConfigureRequestToolsType;
  private configure: ConfigureManagerType;
  private configurePutRequest: ConfigurePutRequestType<U>;

  constructor(
    tools: ConfigureRequestToolsType,
    configure: ConfigureManagerType,
    configurePutRequest: ConfigurePutRequestType<U>,
  ) {
    this.tools = tools;
    this.configure = configure;
    this.configurePutRequest = configurePutRequest;
  }

  protected async before(
    config: PerformRequestParametersType<U>,
    saveIdCreated: { response: CreateDataReturnType | undefined },
  ): Promise<BeforeRequestManagerReturnType> {
    if (!config.checkResultSucceed) {
      config.checkResultSucceed = () => {};
    }
    if (!config.originalData) {
      config.originalData = {};
    }
    if (!config.updateData) {
      config.updateData = {};
    }
    if (config.token === undefined || config.token === null) {
      config.token = true;
    }

    const actor = this.tools.userManager.findUserByKey(config.actorKey);

    let extraData = {};
    if (this.configurePutRequest.prepareRequest) {
      extraData = await this.configurePutRequest.prepareRequest({
        actor: actor,
      });
    }

    let created;
    if (!config.startCreatedCustom) {
      created = await this.configurePutRequest.createData({
        actor: actor,
        originalData: config.originalData,
        updateData: config.updateData,
        extraData: extraData,
        testDataUrl: config.testDataUrl,
      });
      saveIdCreated.response = created;
    } else {
      created = await config.startCreatedCustom({
        actor: actor,
        originalData: config.originalData,
        updateData: config.updateData,
        extraData: extraData,
        testDataUrl: config.testDataUrl,
      });
    }

    let dataToSend = config.updateData;
    if (this.configurePutRequest.processDataForRequest) {
      dataToSend = this.configurePutRequest.processDataForRequest({
        actor: actor,
        responseCreated: created,
        originalData: config.originalData,
        updateData: config.updateData,
        extraData: extraData,
        testDataUrl: config.testDataUrl,
      });
    }

    const url = this.configurePutRequest.generateUrl({
      actor: actor,
      responseCreated: created,
      extraData: extraData,
      updateData: dataToSend,
      testDataUrl: config.testDataUrl,
    });

    return { url, dataToSend, actor, responseCreated: created };
  }

  protected async performRequest(
    config: PerformRequestParametersType<U>,
    beforeResult: BeforeRequestManagerReturnType,
    expect: ExpectStatic,
  ) {
    let response;

    if (config.token) {
      response = await request(this.tools.app.getHttpServer())
        .put(beforeResult.url)
        .set('Authorization', `Bearer ${beforeResult.actor.token}`)
        .send(beforeResult.dataToSend);
    } else {
      response = await request(this.tools.app.getHttpServer())
        .put(beforeResult.url)
        .send(beforeResult.dataToSend);
    }

    if (config.shouldSucceed) {
      expect(response.status).toBe(HttpStatus.OK);
      config.checkResultSucceed({
        originalData: config.originalData,
        updateData: config.updateData,
        responseCreated: beforeResult.responseCreated,
        responseUpdated: response.body,
        expect: expect,
      });

      if (this.configurePutRequest.checkForRequest)
        this.configurePutRequest.checkForRequest({
          originalData: config.originalData,
          updateData: config.updateData,
          responseCreated: beforeResult.responseCreated,
          responseUpdated: response.body,
          expect: expect,
        });
    } else {
      expect(response.status).toBe(config.errorCode);
    }
  }

  executeTest<P, T extends PutTestAbstract<P, U>>(
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
        this.configurePutRequest.destructionResult.bind(this),
      );
    });
  }
}
