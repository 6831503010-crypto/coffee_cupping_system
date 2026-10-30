import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FirstUserGuide } from './first-user-guide';

describe('FirstUserGuide', () => {
  let component: FirstUserGuide;
  let fixture: ComponentFixture<FirstUserGuide>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FirstUserGuide],
    }).compileComponents();

    fixture = TestBed.createComponent(FirstUserGuide);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
