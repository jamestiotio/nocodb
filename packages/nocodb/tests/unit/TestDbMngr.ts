import { DbConfig } from "../../src/interface/config";
import { NcConfigFactory } from "../../src/lib";
import SqlMgrv2 from "../../src/lib/db/sql-mgr/v2/SqlMgrv2";
import fs from 'fs';
import knex from "knex";
import process from "process";

export default class TestDbMngr {
  public static readonly dbName = 'test_meta';
  public static readonly sakilaDbName = 'test_sakila';
  public static metaKnex: knex;
  public static sakilaKnex: knex;

  public static defaultConnection = {
    user: process.env['DB_USER'] || 'root',
    password: process.env['DB_PASSWORD'] || 'password',
    host: process.env['DB_HOST'] || 'localhost',
    port: Number(process.env['DB_PORT']) || 3306,
    client: 'mysql2',
  }

  public static dbConfig: DbConfig;

  static async testConnection(config: DbConfig) {
    try {
      return await SqlMgrv2.testConnection(config);
    } catch (e) {
      console.log(e);
      return { code: -1, message: 'Connection invalid' };
    }
  }

  static async init() {
    if(await TestDbMngr.isMysqlConfigured()){
      await TestDbMngr.connectMysql();
    } else {
      await TestDbMngr.switchToSqlite();
    }
  }

  static async isMysqlConfigured() {
    const { user, password, host, port, client } = TestDbMngr.defaultConnection;
    const config = NcConfigFactory.urlToDbConfig(`${client}://${user}:${password}@${host}:${port}`);
    config.connection = {
      user,
      password,
      host,
      port,
    }
    const result = await TestDbMngr.testConnection(config);
    return result.code !== -1;
  }

  static async connectMysql() {
    const { user, password, host, port, client } = TestDbMngr.defaultConnection;
    if(!process.env[`DATABASE_URL`]){
      process.env[`DATABASE_URL`] = `${client}://${user}:${password}@${host}:${port}/${TestDbMngr.dbName}`;
    }

    TestDbMngr.dbConfig = NcConfigFactory.urlToDbConfig(
      NcConfigFactory.extractXcUrlFromJdbc(process.env[`DATABASE_URL`])
    );
    this.dbConfig.meta = {
      tn: 'nc_evolutions',
      dbAlias: 'db',
      api: {
        type: 'rest',
        prefix: '',
        graphqlDepthLimit: 10,
      },
      inflection: {
        tn: 'camelize',
        cn: 'camelize',
      },
    }

    await TestDbMngr.setupMeta();
    await TestDbMngr.setupSakila();
  }

  static async setupMeta() {
    if(TestDbMngr.metaKnex){
      await TestDbMngr.metaKnex.destroy();
    }

    if(TestDbMngr.isSqlite()){
      await TestDbMngr.resetMetaSqlite();
      TestDbMngr.metaKnex = knex(TestDbMngr.getMetaDbConfig());
      return
    } 

    TestDbMngr.metaKnex = knex(TestDbMngr.getDbConfigWithNoDb());
    await TestDbMngr.resetDatabase(TestDbMngr.metaKnex, TestDbMngr.dbName);
    await TestDbMngr.metaKnex.destroy();

    TestDbMngr.metaKnex = knex(TestDbMngr.getMetaDbConfig());
    await TestDbMngr.useDatabase(TestDbMngr.metaKnex, TestDbMngr.dbName);
  }

  static async setupSakila () {
    if(TestDbMngr.sakilaKnex) {
      await TestDbMngr.sakilaKnex.destroy();
    }

    if(TestDbMngr.isSqlite()){
      await TestDbMngr.seedSakila();
      TestDbMngr.sakilaKnex = knex(TestDbMngr.getSakilaDbConfig());
      return
    } 
    
    TestDbMngr.sakilaKnex = knex(TestDbMngr.getDbConfigWithNoDb());
    await TestDbMngr.resetDatabase(TestDbMngr.sakilaKnex, TestDbMngr.sakilaDbName);
    await TestDbMngr.sakilaKnex.destroy();
    
    TestDbMngr.sakilaKnex = knex(TestDbMngr.getSakilaDbConfig());
    await TestDbMngr.useDatabase(TestDbMngr.sakilaKnex, TestDbMngr.sakilaDbName);
  }

  static async switchToSqlite() {
    // process.env[`DATABASE_URL`] = `sqlite3:///?database=${__dirname}/${TestDbMngr.dbName}.sqlite`;
    TestDbMngr.dbConfig = {
      client: 'sqlite3',
      connection: {
        filename: `${__dirname}/${TestDbMngr.dbName}.db`,
        database: TestDbMngr.dbName,
      },
      useNullAsDefault: true,
      meta: {
        tn: 'nc_evolutions',
        dbAlias: 'db',
        api: {
          type: 'rest',
          prefix: '',
          graphqlDepthLimit: 10,
        },
        inflection: {
          tn: 'camelize',
          cn: 'camelize',
        },
      },
    }

    process.env[`NC_DB`] = `sqlite3:///?database=${__dirname}/${TestDbMngr.dbName}.db`;
    await TestDbMngr.setupMeta();
    await TestDbMngr.setupSakila();
  }

  private static async resetDatabase(knexClient, dbName) {
    if(TestDbMngr.isSqlite()){
      // return knexClient.raw(`DELETE FROM sqlite_sequence`);
    } else {
      try {
        await knexClient.raw(`DROP DATABASE ${dbName}`);
      } catch(e) {}
      await knexClient.raw(`CREATE DATABASE ${dbName}`);
      console.log(`Database ${dbName} created`);
      await knexClient.raw(`USE ${dbName}`);
    }
  }

  static isSqlite() {
    return TestDbMngr.dbConfig.client === 'sqlite3';
  }

  private static async useDatabase(knexClient, dbName) {
    if(!TestDbMngr.isSqlite()){
      await knexClient.raw(`USE ${dbName}`);
    }
  }

  static getDbConfigWithNoDb() {
    const dbConfig =JSON.parse(JSON.stringify(TestDbMngr.dbConfig));
    delete dbConfig.connection.database;
    return dbConfig;
  }

  static getMetaDbConfig() {
    return TestDbMngr.dbConfig;
  }

  private static resetMetaSqlite() {
    if(fs.existsSync(`${__dirname}/test_meta.db`)){
      fs.unlinkSync(`${__dirname}/test_meta.db`);
    }
  }

  static getSakilaDbConfig() {
    const sakilaDbConfig = JSON.parse(JSON.stringify(TestDbMngr.dbConfig));
    sakilaDbConfig.connection.database = TestDbMngr.sakilaDbName;
    sakilaDbConfig.connection.multipleStatements = true
    if(TestDbMngr.isSqlite()){
        sakilaDbConfig.connection.filename = `${__dirname}/test_sakila.db`;
    }
    return sakilaDbConfig;
  }

  static async seedSakila() {     
    const testsDir = __dirname.replace('tests/unit', 'tests');

    if(TestDbMngr.isSqlite()){
      if(fs.existsSync(`${__dirname}/test_sakila.db`)){
        fs.unlinkSync(`${__dirname}/test_sakila.db`);
      }
      fs.copyFileSync(`${testsDir}/sqlite-sakila-db/sakila.db`, `${__dirname}/test_sakila.db`);
    } else {
      const schemaFile = fs.readFileSync(`${testsDir}/mysql-sakila-db/03-test-sakila-schema.sql`).toString();
      const dataFile = fs.readFileSync(`${testsDir}/mysql-sakila-db/04-test-sakila-data.sql`).toString();
      await TestDbMngr.sakilaKnex.raw(schemaFile);
      await TestDbMngr.sakilaKnex.raw(dataFile);
    }
  }

  static async disableForeignKeyChecks(knexClient) {
    if(TestDbMngr.isSqlite()){
      await knexClient.raw("PRAGMA foreign_keys = OFF");
    }
    else {
      await knexClient.raw(`SET FOREIGN_KEY_CHECKS = 0`);
    }
  }

  static async enableForeignKeyChecks(knexClient) {
    if(TestDbMngr.isSqlite()){
      await knexClient.raw(`PRAGMA foreign_keys = ON;`);
    }
    else {
      await knexClient.raw(`SET FOREIGN_KEY_CHECKS = 1`);
    }
  }

  static async showAllTables(knexClient) {
    if(TestDbMngr.isSqlite()){
      const tables = await knexClient.raw(`SELECT name FROM sqlite_master WHERE type='table'`);
      return tables.filter(t => t.name !== 'sqlite_sequence' && t.name !== '_evolutions').map(t => t.name);
    }
    else {
      const response = await knexClient.raw(`SHOW TABLES`);
      return response[0].map(
        (table) => Object.values(table)[0]
      );
    }
  }
}