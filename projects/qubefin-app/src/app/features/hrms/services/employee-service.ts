
import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { ApiPaths } from 'qubefin-core';
import { EmployeeAddressInfo, EmployeeContactInfo, EmployeeDocument, EmployeeOfficialInfo, EmployeePersonalInfo } from '../models/employee-detail';

@Injectable({
    providedIn: 'root',
})
export class EmployeeService {
    httpClient = inject(HttpClient);
    getAll() {
        return this.httpClient.get(`${ApiPaths.HRMS}/employees `);
    }
    getById(id: string) {
        return this.httpClient.get(`${ApiPaths.HRMS}/employees/getById/${id}`);
    }
    getPresonalData(id: string) {
        return this.httpClient.get(`${ApiPaths.HRMS}/employees/personal-details/${id}`);
    }
    getAddressData(id: string) {
        return this.httpClient.get(`${ApiPaths.HRMS}/employees/address-details/${id}`);
    }
    getContactData(id: string) {
        return this.httpClient.get(`${ApiPaths.HRMS}/employees/contact-details/${id}`);
    }
    getOfficialData(id: string) {
        return this.httpClient.get(`${ApiPaths.HRMS}/employees/official-details/${id}`);
    }
    getKycData(id: string) {
        return this.httpClient.get(`${ApiPaths.HRMS}/employees/kyc-details/${id}`);
    }

    create(personalInfo: any) {
        return this.httpClient.post(`${ApiPaths.HRMS}/employees`, personalInfo);
    }
    updatePersonalInfo(employeeId: string,personalInfo: EmployeePersonalInfo) {
        return this.httpClient.put(`${ApiPaths.HRMS}/employees/update/personal/` + employeeId, personalInfo);
    }
    updateDocuments(docs: any) {
        return this.httpClient.put(`${ApiPaths.HRMS}/employees/update-document`, docs);
    }
    updateAddresslInfo(employeeId: string,addressInfo: EmployeeAddressInfo) {
        return this.httpClient.put(`${ApiPaths.HRMS}/employees/update/address/` + employeeId, addressInfo);
    }
    updateContactInfo(employeeId: string,contact: EmployeeContactInfo) {
        return this.httpClient.put(`${ApiPaths.HRMS}/employees/update/contact/` + employeeId, contact);
    }
    updateOfficialInfo(employeeId: string,contact: EmployeeOfficialInfo) {
        return this.httpClient.put(`${ApiPaths.HRMS}/employees/update/official/` + employeeId, contact);
    }
    updateKycInfo(employeeId: string,contact: EmployeeDocument) {
        return this.httpClient.put(`${ApiPaths.HRMS}/employees/update/kyc/` + employeeId, contact);
    }
    
}
