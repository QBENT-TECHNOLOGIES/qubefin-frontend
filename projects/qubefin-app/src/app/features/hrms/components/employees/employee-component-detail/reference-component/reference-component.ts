import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSelectModule } from '@angular/material/select';
import { EMPTY_UUID } from 'qubefin-core';
import { applyEach, form, FormField, required, schema } from '@angular/forms/signals';
import { LucideDynamicIcon } from '@lucide/angular';
import { MatStepperModule } from '@angular/material/stepper';
import { EmployeeService } from '../../../../services/employee-service';
import { rxResource } from '@angular/core/rxjs-interop';
import { of, tap } from 'rxjs';
import { EmployeeReference, IEmployeeReference} from '../../../../models/employee-detail';
import { APP_ICONS_MAP } from '../../../../../../lucide-icons';
import { EmployeeStore } from '../../../../stores/employee-store';
import Swal from 'sweetalert2';


interface ReferenceFormModel {
  references: IEmployeeReference[];
}


@Component({
  selector: 'qfin-reference-component',
  imports: [
    CommonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatSelectModule,
    MatCheckboxModule,
    FormField,
    MatStepperModule,
    LucideDynamicIcon
  ],
  templateUrl: './reference-component.html',
})
export class ReferenceComponentDetail {

  empId = input<string>(EMPTY_UUID);

  onRefUpdate = output<void>();

  isEditMode = computed(() => !!this.empId() && this.empId() !== EMPTY_UUID);

  private readonly employeeStore = inject(EmployeeStore);
  private readonly employeeService = inject(EmployeeService);
  readonly iconMap = APP_ICONS_MAP;

  protected readonly referenceModel = signal<ReferenceFormModel>({
    references: []
  });

    // 2. Refactor your schema block using applyEach
  protected readonly referenceSchema = schema<ReferenceFormModel>((path) => {
    // Ensures the array itself is present
    required(path.references);

    // Iterates cleanly through each item in the array with correct type safety
    applyEach(path.references, (refPath) => {
      required(refPath.personName);
      required(refPath.mobile);
      required(refPath.email);
      required(refPath.address);
    });
  });


  protected readonly referenceForm = form(
    this.referenceModel,
    this.referenceSchema
  );

  constructor(){
    effect(() => {
      if(
        this.referenceModel().references.length === 0
      ){
        // this.addReference();
        const model = new EmployeeReference();
            model.id = EMPTY_UUID;
            model.employeeId = this.empId();

        this.referenceModel.set({references :[model]});
      }
    })


  }

  addReference(){
    const model = new EmployeeReference();
    model.employeeId = this.empId();
    this.referenceModel.update(state => ({
      references:[
        ...state.references,
        model
      ]
    }));
  }

  removeReference(index:number){
    this.referenceModel.update(state => ({
      references:
        state.references.filter((_,i)=>i !== index)
    }));
  }

  
  

  onSubmit(){
 
    
    if(!this.referenceForm().valid()){
          return;
        }
    const dataToSave = [...this.referenceForm().value().references].map(ref => {
      const cleanedRef = { ...ref };
      
      // Cast keys to keyof typeof cleanedRef to fix the TypeScript error
      (Object.keys(cleanedRef) as Array<keyof typeof cleanedRef>).forEach(key => {
        if (cleanedRef[key] === "") {
          cleanedRef[key] = null as any; // Cast to any to allow null on string fields
        }
      });
      
      return cleanedRef;
    });
    this.employeeService.updateReferenceInfo(this.empId(),dataToSave).subscribe({
        next: () => {
          this.employeeStore.refreshList();
          this.employeeStore.refreshDetail();
          this.onRefUpdate.emit();
        },
        error: (err: any) => {
          if (err.error?.isError) {
          }
        }
      });
  }

  

  private kycResource = rxResource({
    params: () => ({ id: this.empId(), editMode: this.isEditMode() }),
    stream: ({ params }) => {
      if (params.editMode && params.id !== EMPTY_UUID) {        
        return this.employeeService.getReferenceData(params.id).pipe(
          tap((resp: any) => {
            this.referenceModel.update(state => ({
              references: (resp.references ?? []).map(
                (doc: IEmployeeReference) =>
                  new EmployeeReference({
                    ...doc
                  })
              ),
            }));
          })
        );
      } else {
        this.referenceModel.set({

          references:[]

        });
        return of(null); // Safely stream an empty observable
      }
    }
  });
}