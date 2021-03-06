import { Component, OnInit, Input } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import {DataSource} from '@angular/cdk/collections';
import {Observable} from 'rxjs';
import {first} from 'rxjs/operators';
import {FirebaseService} from '../services/firebase.service';
import { ParticleService } from '../services/particle.service';
// dialog
import { ProfileDialogComponent } from '../profile-dialog/profile-dialog.component';
// model
import {Row} from '../models/row';

@Component({
  selector: 'app-beer-profile',
  templateUrl: './beer-profile.component.html',
  styleUrls: ['./beer-profile.component.scss']
})

export class BeerProfileComponent implements OnInit  {
  @Input() item: any;
  public row: Row;
  public profilelist = [];
  public currentProfile = 'null';
  public profileRunning = false;
  displayedColumns = ['day', 'temperature', 'edit', 'delete'];
  dataSource: ChartDataSource | null;
  constructor(private fb: FirebaseService, private particleService: ParticleService, private mdDialog: MatDialog) {
}

ngOnInit() {
  this.fb.profileList.subscribe(res => this.profilelist = res);
  this.item.pipe(first()).subscribe(res => {
    this.currentProfile = res.profileName;
  });
  this.item.subscribe(res => {
    if (res.mode === '3') this.profileRunning = true;
    else this.profileRunning = false;
  });
}

// the particle function expects a sting of format {profileName,0,66,3,70,4,65,} the numbers are day temperature 
// pairs.  the trailing comma is required.
startProfile() {
  let profile: any;
  let profileString: string = this.currentProfile;
  const tempFormat = localStorage.getItem('tempFormat');
  this.fb.table(this.currentProfile).subscribe(
    res => {profile = res;
    console.log('start profile', profile);
    profile.forEach(eachObj => {
      if (tempFormat === 'F') {
        eachObj.temperature = ((eachObj.temperature - 32) / 1.8).toFixed(1);
      }
      profileString = profileString + ',' + eachObj.day + ',' + eachObj.temperature;
    });
    profileString = profileString + ',';
    console.log('profile string check', profileString);
    console.log('profile length', profileString.length);
    this.particleService.CallFunction('profileSetup', profileString)
    .subscribe(res => {
      console.log('function profilesetup response', res);
      this.particleService.CallFunction('setMode', '3')
        .subscribe(res => {
          console.log('function call response', res); 
        });
    });
  });
}





createNewProfile(profile: string) {
  this.fb.createNewProfile(profile);
  this.profileChange(profile);
}

profileChange(profile: string) {
  this.currentProfile = profile;
  this.dataSource = new ChartDataSource(this.fb,profile);
}

openDialogEdit(row: Row) {
  const dialogRef = this.mdDialog.open(ProfileDialogComponent, {
    width: '250px',
    data: { row: row }
  });
  dialogRef.afterClosed().subscribe(result => {
    this.row = result;
    this.fb.updateRow(this.currentProfile, this.row.key, { 'temperature': this.row.temperature, 'day': this.row.day });
  }
  );
}

openDialogAdd() {
  this.row = { day: null, temperature: null };
  const dialogRef = this.mdDialog.open(ProfileDialogComponent, {
    width: '250px',
    data: { row: this.row }
  });
  dialogRef.afterClosed().subscribe(result => {
    this.row = result;
    this.fb.addRow(this.currentProfile, this.row);
  }
  );
}

deleteRow(row: Row) {
  this.fb.deleteRow(this.currentProfile, row.key);
}

deleteProfile() {
  this.fb.deleteList('Profile/' + this.currentProfile);
  this.profileChange('null');
}

}




/**
 * Data source to provide what data should be rendered in the table. The observable provided
 * in connect should emit exactly the data that should be rendered by the table. If the data is
 * altered, the observable should emit that new set of data on the stream. In our case here,
 * we return a stream that contains only one set of data that doesn't change.
 */
export class ChartDataSource extends DataSource<any> {
  /** Connect function called by the table to retrieve one stream containing the data to render. */
  constructor(private fb: FirebaseService, private currentPro: string) {
    super();
  }
  connect(): Observable<Row[]> {
    return this.fb.table(this.currentPro);
  }

  disconnect() {}
}
