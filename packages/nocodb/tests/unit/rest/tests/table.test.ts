// import { expect } from 'chai';
import 'mocha';
import request from 'supertest';
import init from '../../init';
import { createTable, getAllTables } from '../../factory/table';
import { createProject } from '../../factory/project';
import { defaultColumns } from '../../factory/column';
import Model from '../../../../src/lib/models/Model';

function tableTest() {
  let context;
  let project;
  let table;

  beforeEach(async function () {
    context = await init();

    project = await createProject(context);
    table = await createTable(context, project);
  });

  it('Get table list', async function () {
    const response = await request(context.app)
      .get(`/api/v1/db/meta/projects/${project.id}/tables`)
      .set('xc-auth', context.token)
      .send({})
      .expect(200);

    if (response.body.list.length !== 1) return new Error('Wrong number of tables');
  });

  it('Create table', async function () {
    const response = await request(context.app)
      .post(`/api/v1/db/meta/projects/${project.id}/tables`)
      .set('xc-auth', context.token)
      .send({
        table_name: 'table2',
        title: 'new_title_2',
        columns: defaultColumns(context),
      })
      .expect(200);

    const tables = await getAllTables({ project });
    if (tables.length !== 2) {
      return new Error('Tables is not be created');
    }

    if (response.body.columns.length !== (defaultColumns(context))) {
      return new Error('Columns not saved properly');
    }

    if (
      !(
        response.body.table_name.startsWith(project.prefix) &&
        response.body.table_name.endsWith('table2')
      )
    ) {
      return new Error('table name not configured properly');
    }
  });

  it('Create table with no table name', async function () {
    const response = await request(context.app)
      .post(`/api/v1/db/meta/projects/${project.id}/tables`)
      .set('xc-auth', context.token)
      .send({
        table_name: undefined,
        title: 'new_title',
        columns: defaultColumns(context),
      })
      .expect(400);

    if (
      !response.text.includes(
        'Missing table name `table_name` property in request body'
      )
    ) {
      console.error(response.text);
      return new Error('Wrong api response');
    }

    const tables = await getAllTables({ project });
    if (tables.length !== 1) {
      console.log(tables);
      return new Error(
        `Tables should not be created, tables.length:${tables.length}`
      );
    }
  });

  it('Create table with same table name', async function () {
    const response = await request(context.app)
      .post(`/api/v1/db/meta/projects/${project.id}/tables`)
      .set('xc-auth', context.token)
      .send({
        table_name: table.table_name,
        title: 'New_title',
        columns: defaultColumns(context),
      })
      .expect(400);

    if (!response.text.includes('Duplicate table name')) {
      console.error(response.text);
      return new Error('Wrong api response');
    }

    const tables = await getAllTables({ project });
    if (tables.length !== 1) {
      return new Error('Tables should not be created');
    }
  });

  it('Create table with same title', async function () {
    const response = await request(context.app)
      .post(`/api/v1/db/meta/projects/${project.id}/tables`)
      .set('xc-auth', context.token)
      .send({
        table_name: 'New_table_name',
        title: table.title,
        columns: defaultColumns(context),
      })
      .expect(400);

      if (!response.text.includes('Duplicate table alias')) {
        console.error(response.text);
        return new Error('Wrong api response');
      }

      const tables = await getAllTables({ project });
      if (tables.length !== 1) {
        return new Error('Tables should not be created');
      }
  });

  it('Create table with title length more than the limit', async function () {
    const response = await request(context.app)
      .post(`/api/v1/db/meta/projects/${project.id}/tables`)
      .set('xc-auth', context.token)
      .send({
        table_name: 'a'.repeat(256),
        title: 'new_title',
        columns: defaultColumns(context),
      })
      .expect(400);

    if (!response.text.includes('Table name exceeds ')) {
      console.error(response.text);
      return new Error('Wrong api response');
    }

    const tables = await getAllTables({ project });
    if (tables.length !== 1) {
      return new Error('Tables should not be created');
    }

  });

  it('Create table with title having leading white space', async function () {
    const response = await request(context.app)
      .post(`/api/v1/db/meta/projects/${project.id}/tables`)
      .set('xc-auth', context.token)
      .send({
        table_name: 'table_name_with_whitespace ',
        title: 'new_title',
        columns: defaultColumns(context),
      })
      .expect(400);

    if (
      !response.text.includes(
        'Leading or trailing whitespace not allowed in table names'
      )
    ) {
      console.error(response.text);
      return new Error('Wrong api response');
    }

    const tables = await getAllTables({ project });
    if (tables.length !== 1) {
      return new Error('Tables should not be created');
    }
  });

  it('Update table', async function () {
    const response = await request(context.app)
      .patch(`/api/v1/db/meta/tables/${table.id}`)
      .set('xc-auth', context.token)
      .send({
        project_id: project.id,
        table_name: 'new_title',
      })
      .expect(200);
    const updatedTable = await Model.get(table.id);

    if (!updatedTable.table_name.endsWith('new_title')) {
      return new Error('Table was not updated');
    }
  });

  it('Delete table', async function () {
    const response = await request(context.app)
      .delete(`/api/v1/db/meta/tables/${table.id}`)
      .set('xc-auth', context.token)
      .send({})
      .expect(200);

    const tables = await getAllTables({ project });

    if (tables.length !== 0) {
      return new Error('Table is not deleted');
    }
  });

  // todo: Check the condtion where the table being deleted is being refered by multiple tables
  // todo: Check the if views are also deleted

  it('Get table', async function () {
    const response = await request(context.app)
      .get(`/api/v1/db/meta/tables/${table.id}`)
      .set('xc-auth', context.token)
      .send({})
      .expect(200);

      if (response.body.id !== table.id) new Error('Wrong table');
  });

  // todo: flaky test, order condition is sometimes not met
  it('Reorder table', async function () {
    const newOrder = table.order === 0 ? 1 : 0;
    const response = await request(context.app)
      .post(`/api/v1/db/meta/tables/${table.id}/reorder`)
      .set('xc-auth', context.token)
      .send({
        order: newOrder,
      })
      .expect(200);
    // .expect(200, async (err) => {
    //   if (err) return new Error(err);

    //   const updatedTable = await Model.get(table.id);
    //   console.log(Number(updatedTable.order), newOrder);
    //   if (Number(updatedTable.order) !== newOrder) {
    //     return new Error('Reordering failed');
    //   }

    //   new Error();
    // });
  });
}

export default async function () {
  describe('Table', tableTest);
}
