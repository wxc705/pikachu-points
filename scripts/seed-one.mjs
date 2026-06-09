// 一次性：种 1 个项目用于截图验证
(async () => {
 const { getProjects, addProject, setProjectActive } = await import('./src/services/db.js')
 const all = await getProjects()
 console.log('现有项目:', all.length)
 const test = {
 category: '学习',
 name: '测试项目-' + Date.now(),
 points: 2,
 sortOrder: 99,
 isActive: true
 }
 const id = await addProject(test)
 console.log('新增 id:', id, test.name)
 const after = await getProjects()
 console.log('现在有:', after.length, '个项目')
})()
