/* eslint-disable no-unused-expressions */
/* eslint-disable no-return-assign */
import {
    buildRights,
    IUser,
    KYCStatus,
    Role,
    UserStatus,
    UserRegistrationData
} from '@energyweb/origin-backend-core';
import { INestApplication } from '@nestjs/common';
import { expect } from 'chai';
import request from 'supertest';

import { DatabaseService } from './database.service';
import { bootstrapTestInstance, registerAndLogin } from './origin-backend';
import { omit } from './utils';
import { UserService } from '../src/pods/user/user.service';
import { OrganizationService } from '../src/pods/organization/organization.service';

describe('User e2e tests', () => {
    let app: INestApplication;
    let databaseService: DatabaseService;
    let userService: UserService;
    let organizationService: OrganizationService;

    const userToRegister: UserRegistrationData = {
        title: 'Mr',
        firstName: 'John',
        lastName: 'Rambo',
        email: 'john@example.com',
        password: 'FirstBlood',
        telephone: '+11'
    };

    before(async () => {
        ({
            app,
            databaseService,
            userService,
            organizationService
        } = await bootstrapTestInstance());

        await app.init();
    });

    beforeEach(async () => {
        await databaseService.truncate('user');
    });

    after(async () => {
        await app.close();
    });

    it('should be able to register user', async () => {
        await request(app.getHttpServer())
            .post(`/user/register`)
            .send(userToRegister)
            .expect((res) => {
                const user = res.body as IUser;

                expect(user.email).equals(userToRegister.email);
                expect(user.organization).to.be.undefined;
                expect(user.rights).equals(buildRights([Role.OrganizationAdmin]));
                expect(user.status).equals(UserStatus.Pending);
                expect(user.kycStatus).equals(KYCStatus.Pending);
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                expect((user as any).password).to.be.undefined;
            });

        let accessToken: string;

        await request(app.getHttpServer())
            .post('/auth/login')
            .send({
                username: userToRegister.email,
                password: userToRegister.password
            })
            .expect((res) => ({ accessToken } = res.body));

        await request(app.getHttpServer())
            .get(`/user/me`)
            .set('Authorization', `Bearer ${accessToken}`)
            .expect((res) => {
                const user = res.body as IUser;

                expect(user.email).equals(userToRegister.email);
            });
    });

    it('should not be able to register user with the same email', async () => {
        await request(app.getHttpServer()).post(`/user/register`).send(userToRegister).expect(201);

        const otherUserWithSameEmail: UserRegistrationData = {
            ...userToRegister,
            firstName: 'Samuel',
            lastName: 'Trautman'
        };

        await request(app.getHttpServer())
            .post(`/user/register`)
            .send(otherUserWithSameEmail)
            .expect(409);
    });

    it('should not be able to register user with missing input data', async () => {
        await request(app.getHttpServer())
            .post(`/user/register`)
            .send(omit(userToRegister, 'password'))
            .expect(400);
    });

    it('user should be able to get his user data', async () => {
        const { accessToken, user } = await registerAndLogin(
            app,
            userService,
            organizationService,
            [Role.OrganizationUser, Role.OrganizationDeviceManager]
        );

        await request(app.getHttpServer())
            .get(`/user/${user.id}`)
            .set('Authorization', `Bearer ${accessToken}`)
            .expect(200);
    });

    it('user should not be able to get user data of another user', async () => {
        const { user } = await registerAndLogin(app, userService, organizationService, [
            Role.OrganizationUser,
            Role.OrganizationDeviceManager
        ]);

        const { accessToken: accessToken2 } = await registerAndLogin(
            app,
            userService,
            organizationService,
            [Role.OrganizationUser, Role.OrganizationDeviceManager],
            'differentOrganization',
            'differentOrganization'
        );

        await request(app.getHttpServer())
            .get(`/user/${user.id}`)
            .set('Authorization', `Bearer ${accessToken2}`)
            .expect(401);
    });

    it('admin/support agent should be able to get user data of another user', async () => {
        const { accessToken } = await registerAndLogin(app, userService, organizationService, [
            Role.Admin
        ]);

        const { user } = await registerAndLogin(
            app,
            userService,
            organizationService,
            [Role.OrganizationUser, Role.OrganizationDeviceManager],
            'differentOrganization',
            'differentOrganization'
        );

        await request(app.getHttpServer())
            .get(`/user/${user.id}`)
            .set('Authorization', `Bearer ${accessToken}`)
            .expect(200);
    });

    it('org admin should be able to get user data of another user', async () => {
        const { accessToken } = await registerAndLogin(app, userService, organizationService, [
            Role.OrganizationAdmin
        ]);

        const { user } = await registerAndLogin(app, userService, organizationService, [
            Role.OrganizationUser,
            Role.OrganizationDeviceManager
        ]);

        await request(app.getHttpServer())
            .get(`/user/${user.id}`)
            .set('Authorization', `Bearer ${accessToken}`)
            .expect(200);
    });

    it('org admin should not be able to get user data from another organization', async () => {
        const { accessToken } = await registerAndLogin(app, userService, organizationService, [
            Role.OrganizationAdmin
        ]);

        const { user } = await registerAndLogin(
            app,
            userService,
            organizationService,
            [Role.OrganizationUser, Role.OrganizationDeviceManager],
            'differentOrganization',
            'differentOrganization'
        );

        await request(app.getHttpServer())
            .get(`/user/${user.id}`)
            .set('Authorization', `Bearer ${accessToken}`)
            .expect(401);
    });
});
