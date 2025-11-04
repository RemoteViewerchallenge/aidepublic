import { XtermTerminal } from './XtermTerminal';
import './XtermTerminal.css';

export default function Workspace1() {
  return (
    <div className="workspace-grid">
      {/* Column 1 - Existing content */}
      <div className="grid-item col-1 row-1">
        {/* Existing content for column 1, row 1 */}
      </div>

      {/* Column 2 - Existing content */}
      <div className="grid-item col-2 row-1">
        {/* Existing content for column 2, row 1 */}
      </div>

      {/* Column 3 - Existing content */}
      <div className="grid-item col-3 row-1">
        {/* Existing content for column 3, row 1 */}
      </div>

      {/* Column 4 - Terminal */}
      <div className="grid-item col-4 row-1 row-span-2">
        <XtermTerminal />
      </div>

      {/* Column 1 - Existing content */}
      <div className="grid-item col-1 row-2">
        {/* Existing content for column 1, row 2 */}
      </div>

      {/* Column 2 - Existing content */}
      <div className="grid-item col-2 row-2">
        {/* Existing content for column 2, row 2 */}
      </div>

      {/* Column 3 - Existing content */}
      <div className="grid-item col-3 row-2">
        {/* Existing content for column 3, row 2 */}
      </div>
    </div>
  );
}
