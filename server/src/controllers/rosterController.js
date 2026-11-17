import * as rosterService from '../services/rosterService.js';

export async function list(req, res) {
  try {
    const people = await rosterService.listRoster();
    return res.json({ people });
  } catch (error) {
    return res.status(error.status || 500).json({
      error: error.message || 'Không đọc được danh sách người.'
    });
  }
}

export async function create(req, res) {
  try {
    const person = await rosterService.createRosterPerson(req.validated);
    return res.status(201).json({ person });
  } catch (error) {
    return res.status(error.status || 500).json({
      error: error.message || 'Tạo người trong danh sách thất bại.'
    });
  }
}

export async function update(req, res) {
  try {
    const person = await rosterService.updateRosterPerson(req.params.id, req.validated);
    return res.json({ person });
  } catch (error) {
    return res.status(error.status || 500).json({
      error: error.message || 'Cập nhật danh sách thất bại.'
    });
  }
}

export async function remove(req, res) {
  try {
    await rosterService.deleteRosterPerson(req.params.id);
    return res.status(204).send();
  } catch (error) {
    return res.status(error.status || 500).json({
      error: error.message || 'Xóa khỏi danh sách thất bại.'
    });
  }
}

export async function link(req, res) {
  try {
    const result = await rosterService.linkRosterPerson(req.params.id, req.user.id);
    return res.json(result);
  } catch (error) {
    return res.status(error.status || 500).json({
      error: error.message || 'Liên kết tên thất bại.'
    });
  }
}

export async function unlink(req, res) {
  try {
    const person = await rosterService.unlinkRosterPerson(req.params.id);
    return res.json({ person });
  } catch (error) {
    return res.status(error.status || 500).json({
      error: error.message || 'Hủy liên kết thất bại.'
    });
  }
}
